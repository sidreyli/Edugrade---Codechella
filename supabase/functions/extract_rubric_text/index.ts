import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
// @deno-types="npm:@types/pdf-parse"
import pdfParse from "npm:pdf-parse@1.1.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

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

async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    const buffer = new Uint8Array(pdfBuffer);
    const data = await pdfParse(buffer);

    if (data.text && data.text.trim()) {
      return `[RUBRIC - ${data.numpages} page(s)]\n\n${data.text}`;
    } else {
      return `[PDF Processed - No Text Found]\n\nThis PDF has ${data.numpages} page(s) but no extractable text.`;
    }
  } catch (error: any) {
    console.error('PDF parsing error:', error);
    return `[PDF TEXT EXTRACTION FAILED]\n\nError: ${error.message}`;
  }
}

async function extractTextFromImage(imageBuffer: ArrayBuffer, serviceAccount: any): Promise<string> {
  const accessToken = await getGoogleAccessToken(serviceAccount);

  const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

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
      return response.fullTextAnnotation.text;
    } else if (response.textAnnotations && response.textAnnotations.length > 0) {
      return response.textAnnotations[0].description;
    } else {
      return '[No text detected in image]';
    }
  } else {
    return '[No response from Vision API]';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const { fileUrl, rubricId } = await req.json();

    if (!fileUrl || !rubricId) {
      throw new Error('Missing fileUrl or rubricId');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleServiceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fileName = fileUrl.split('/').pop() || '';
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    const isPDF = fileExtension === 'pdf';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension || '');

    console.log(`Processing rubric: ${fileName}, Type: ${isPDF ? 'PDF' : isImage ? 'Image' : 'Unknown'}`);

    let extractedText = '';

    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch file from storage');
    }

    const fileBuffer = await fileResponse.arrayBuffer();

    if (isPDF) {
      console.log('Processing PDF rubric...');
      extractedText = await extractTextFromPDF(fileBuffer);
    } else if (isImage) {
      if (!googleServiceAccountJson) {
        extractedText = `[SIMULATED OCR]\n\nFile: ${fileName}\n\nConfigure GOOGLE_SERVICE_ACCOUNT_JSON for real OCR`;
      } else {
        const serviceAccount = JSON.parse(googleServiceAccountJson);
        console.log('Extracting text from rubric image...');
        extractedText = await extractTextFromImage(fileBuffer, serviceAccount);
      }
    } else {
      extractedText = `[Unsupported file type: ${fileExtension}]`;
    }

    const { error: updateError } = await supabase
      .from('rubrics')
      .update({
        extracted_text: extractedText,
        status: 'completed'
      })
      .eq('id', rubricId);

    if (updateError) {
      throw updateError;
    }

    console.log('Rubric extraction completed');

    return new Response(
      JSON.stringify({
        success: true,
        extractedText,
        message: 'Rubric extraction completed successfully'
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Rubric extraction error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 500
      }
    );
  }
});
