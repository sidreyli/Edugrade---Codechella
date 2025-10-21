import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
// @deno-types="npm:@types/pdf-parse"
import pdfParse from "npm:pdf-parse@1.1.1";
import mammoth from "npm:mammoth@1.6.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Sanitize text to remove problematic characters
function sanitizeText(text: string): string {
  if (!text) return '';

  // Remove null bytes and other problematic Unicode characters
  return text
    .replace(/\u0000/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters except newlines and tabs
    .trim();
}

// Helper function to get Google OAuth2 access token from service account
async function getGoogleAccessToken(serviceAccountJson: any): Promise<string> {
  const jwtHeader = btoa(JSON.stringify({
    alg: 'RS256',
    typ: 'JWT'
  }));

  const now = Math.floor(Date.now() / 1000);
  const jwtClaimSet = {
    iss: serviceAccountJson.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-vision',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const jwtClaimSetEncoded = btoa(JSON.stringify(jwtClaimSet))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const signatureInput = `${jwtHeader}.${jwtClaimSetEncoded}`;

  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = serviceAccountJson.private_key
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );

  const encoder = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(signatureInput)
  );

  const signatureArray = new Uint8Array(signatureBuffer);
  const signature = btoa(String.fromCharCode(...signatureArray))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signatureInput}.${signature}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Extract text from PDF using pdf-parse
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    // Convert ArrayBuffer to Buffer for pdf-parse
    const buffer = new Uint8Array(pdfBuffer);

    // Parse PDF
    const data = await pdfParse(buffer);

    if (data.text && data.text.trim()) {
      return `[PDF TEXT EXTRACTION]\n\nPages: ${data.numpages}\n\n${data.text}`;
    } else {
      return `[PDF Processed - No Text Found]\n\nThis PDF has ${data.numpages} page(s) but no extractable text was found.\n\nPossible reasons:\n- The PDF contains only images/scans\n- The PDF is encrypted or protected\n- The text is embedded as images\n\nRecommendation: Convert PDF pages to images (JPG/PNG) and upload for OCR processing.`;
    }
  } catch (error: any) {
    console.error('PDF parsing error:', error);
    return `[PDF TEXT EXTRACTION FAILED]\n\nError: ${error.message}\n\nThis PDF may be:\n- Password protected\n- Corrupted\n- Using an unsupported format\n\nPlease try:\n1. Converting to images (JPG/PNG) for OCR\n2. Saving as a different PDF version\n3. Ensuring the file is not password protected`;
  }
}

// Extract text from DOCX using mammoth
async function extractTextFromDOCX(docxBuffer: ArrayBuffer): Promise<string> {
  try {
    const buffer = new Uint8Array(docxBuffer);

    // Extract raw text using mammoth
    const result = await mammoth.extractRawText({ buffer });

    if (result.value && result.value.trim()) {
      let output = `[DOCX TEXT EXTRACTION]\n\n${result.value}`;

      // Add any warnings or notes from mammoth
      if (result.messages && result.messages.length > 0) {
        const warnings = result.messages.filter((msg: any) => msg.type === 'warning');
        if (warnings.length > 0) {
          output += `\n\n[Extraction Notes]\n`;
          warnings.forEach((msg: any) => {
            output += `- ${msg.message}\n`;
          });
        }
      }

      return output;
    } else {
      return `[DOCX Processed - No Text Found]\n\nThe document appears to be empty or contains only formatting/images.\n\nPlease verify the document contains actual text content.`;
    }
  } catch (error: any) {
    console.error('DOCX parsing error:', error);
    return `[DOCX EXTRACTION FAILED]\n\nError: ${error.message}\n\nThis DOCX file may be:\n- Corrupted or incomplete\n- Password protected\n- Created with an incompatible version\n\nPlease try:\n1. Opening and re-saving the file in Microsoft Word\n2. Converting to PDF format\n3. Copying text into a plain text (.txt) file`;
  }
}

// Extract text from image using Google Vision API (with size limit and chunked processing)
async function extractTextFromImage(imageBuffer: ArrayBuffer, serviceAccount: any): Promise<string> {
  // Check image size - Google Vision API has limits
  const maxSize = 10 * 1024 * 1024; // 10MB limit
  if (imageBuffer.byteLength > maxSize) {
    throw new Error(`Image too large (${Math.round(imageBuffer.byteLength / 1024 / 1024)}MB). Maximum size is 10MB. Please compress or resize the image.`);
  }

  const accessToken = await getGoogleAccessToken(serviceAccount);

  // Convert to base64 in chunks to avoid stack overflow on large images
  const uint8Array = new Uint8Array(imageBuffer);
  const chunkSize = 65536; // Process 64KB at a time
  let base64Image = '';

  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, Math.min(i + chunkSize, uint8Array.length));
    base64Image += String.fromCharCode(...chunk);
  }

  base64Image = btoa(base64Image);

  const visionResponse = await fetch('https://vision.googleapis.com/v1/images:annotate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [{
        image: { content: base64Image },
        features: [{
          type: 'DOCUMENT_TEXT_DETECTION',
          maxResults: 1
        }]
      }]
    })
  });

  if (!visionResponse.ok) {
    const errorText = await visionResponse.text();
    throw new Error(`Google Vision API error: ${errorText}`);
  }

  const visionData = await visionResponse.json();

  if (visionData.responses && visionData.responses[0]) {
    const response = visionData.responses[0];

    if (response.error) {
      throw new Error(`Vision API error: ${response.error.message}`);
    }

    if (response.fullTextAnnotation) {
      return `[IMAGE OCR EXTRACTION]\n\n${response.fullTextAnnotation.text}`;
    } else if (response.textAnnotations && response.textAnnotations.length > 0) {
      return `[IMAGE OCR EXTRACTION]\n\n${response.textAnnotations[0].description}`;
    } else {
      return '[No text detected in image]\n\nThe image may not contain readable text, or the text may be too small/blurry to detect.';
    }
  } else {
    return '[No response from Vision API]\n\nPlease try uploading the image again.';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let submissionId: string | null = null;

  try {
    const { fileUrl, submissionId: subId } = await req.json();
    submissionId = subId;

    if (!fileUrl || !submissionId) {
      throw new Error('Missing fileUrl or submissionId');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleServiceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine file type from URL
    const fileName = fileUrl.split('/').pop() || '';
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    const isPDF = fileExtension === 'pdf';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension || '');
    const isDOCX = ['docx', 'doc'].includes(fileExtension || '');
    const isTXT = ['txt', 'text', 'md'].includes(fileExtension || '');

    console.log(`Processing file: ${fileName}, Type: ${isPDF ? 'PDF' : isImage ? 'Image' : isDOCX ? 'DOCX' : isTXT ? 'Text' : 'Unknown'}`);

    let extractedText = '';

    // Fetch the file from Supabase Storage
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch file from storage');
    }

    const fileBuffer = await fileResponse.arrayBuffer();

    if (isPDF) {
      // Extract text from PDF using pdf-parse
      console.log('Processing PDF file with pdf-parse...');
      extractedText = await extractTextFromPDF(fileBuffer);
    } else if (isDOCX) {
      // Extract text from DOCX using mammoth
      console.log('Processing DOCX file with mammoth...');
      extractedText = await extractTextFromDOCX(fileBuffer);
    } else if (isImage) {
      // Extract text from image using Google Vision API
      if (!googleServiceAccountJson) {
        console.warn('Google Service Account JSON not found. Using simulated OCR.');
        extractedText = `[SIMULATED OCR - Configure GOOGLE_SERVICE_ACCOUNT_JSON for real OCR]

File: ${fileName}
Processed: ${new Date().toISOString()}

This is simulated text extraction. To enable real OCR:
1. Add your Google Cloud Vision API service account JSON to GOOGLE_SERVICE_ACCOUNT_JSON secret
2. File will be automatically processed with real OCR

Sample content placeholder for: ${fileName}`;
      } else {
        const serviceAccount = JSON.parse(googleServiceAccountJson);
        console.log('Extracting text from image using Google Vision API...');
        extractedText = await extractTextFromImage(fileBuffer, serviceAccount);
      }
    } else if (isTXT) {
      // Handle plain text files
      console.log('Processing plain text file...');
      try {
        const decoder = new TextDecoder('utf-8');
        extractedText = decoder.decode(fileBuffer);
        if (!extractedText.trim()) {
          extractedText = '[Empty File]\n\nThe text file appears to be empty.';
        } else {
          extractedText = `[TEXT FILE CONTENT]\n\n${extractedText}`;
        }
      } catch (err) {
        extractedText = `[Text File Error]\n\nCould not decode text file. It may use an unsupported encoding.`;
      }
    } else {
      // Unsupported file type
      console.log('Unknown file type, attempting text extraction...');
      try {
        const decoder = new TextDecoder('utf-8');
        extractedText = decoder.decode(fileBuffer);

        // Check if it looks like binary data
        if (extractedText.includes('�') || extractedText.includes('\u0000') || !extractedText.trim()) {
          extractedText = `[Unsupported File Type]

File: ${fileName}
Type: ${fileExtension?.toUpperCase() || 'Unknown'}

This file type is not supported for text extraction.

✅ Supported formats:
- PDF documents (.pdf)
- Word documents (.docx, .doc)
- Images (.jpg, .jpeg, .png, .gif, .bmp, .webp) - requires OCR
- Plain text (.txt, .md)

⚠️ Your file type: ${fileExtension?.toUpperCase() || 'Unknown'}

Please convert your file to one of the supported formats and try again.`;
        } else {
          extractedText = `[Text Extraction Attempt]\n\n${extractedText}`;
        }
      } catch (err) {
        extractedText = `[File Processing Error]

Could not process file: ${fileName}

Supported formats:
- PDF (.pdf)
- Word (.docx, .doc)
- Images (.jpg, .png) for OCR
- Plain text (.txt)

Please convert your file to a supported format.`;
      }
    }

    // Sanitize the extracted text to remove null bytes and problematic characters
    extractedText = sanitizeText(extractedText);

    // Update submission with extracted text
    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        extracted_text: extractedText,
        status: 'completed'
      })
      .eq('id', submissionId);

    if (updateError) {
      throw updateError;
    }

    console.log('Text extraction completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        extractedText,
        fileType: isPDF ? 'pdf' : isImage ? 'image' : isDOCX ? 'docx' : isTXT ? 'text' : 'other',
        message: 'Text extraction completed successfully'
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Text extraction error:', error);

    // If we have a submissionId, mark the submission as failed
    if (submissionId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        await supabase
          .from('submissions')
          .update({
            status: 'failed',
            extracted_text: `[EXTRACTION FAILED]\n\nError: ${error.message}\n\nTroubleshooting tips:\n- Ensure file is not corrupted\n- Try converting DOCX to PDF\n- Compress large images (max 10MB)\n- Use supported formats: PDF, DOCX, JPG, PNG, TXT\n\nContact your teacher if the problem persists.`
          })
          .eq('id', submissionId);

        console.log('Marked submission as failed in database');
      } catch (updateError) {
        console.error('Failed to update submission status:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
