// Utility function to calculate letter grade based on classroom's grading scale
export const getLetterGrade = (score: number, gradingScale: Record<string, number>): string => {
  // Sort grades by threshold descending
  const sortedGrades = Object.entries(gradingScale)
    .sort((a, b) => b[1] - a[1]);
  
  // Find the appropriate letter grade
  for (const [letter, threshold] of sortedGrades) {
    if (score >= threshold) {
      return letter;
    }
  }
  
  // Default to lowest grade (usually F)
  return sortedGrades[sortedGrades.length - 1]?.[0] || 'F';
};

// Default grading scale
export const DEFAULT_GRADING_SCALE: Record<string, number> = {
  'A': 90,
  'B': 80,
  'C': 70,
  'D': 60,
  'F': 0
};

// Get grade color for neobrutalist theme
export const getGradeColor = (letter: string): string => {
  switch (letter.charAt(0)) {
    case 'A':
      return 'bg-neo-green';
    case 'B':
      return 'bg-neo-cyan';
    case 'C':
      return 'bg-neo-yellow';
    case 'D':
      return 'bg-neo-pink';
    case 'F':
      return 'bg-neo-pink text-neo-white';
    default:
      return 'bg-neo-white';
  }
};
