import 'reflect-metadata';
import AppDataSource from '../../config/datasource';
import { Board } from '../../entities/Board';
import { Class } from '../../entities/Class';
import { Subject } from '../../entities/Subject';
import { Book } from '../../entities/Book';
import { Chapter } from '../../entities/Chapter';
import { Topic } from '../../entities/Topic';
import { ContentBlock } from '../../entities/ContentBlock';
import { Quiz } from '../../entities/Quiz';
import { Question } from '../../entities/Question';
import { Medium, BlockType, QuizType, DifficultyLevel, QuestionType } from '../../entities/enums';
import { logger } from '../../utils/logger';

// ==================== DATA DEFINITIONS ====================

interface SubjectData {
  subjectName: string;
  displayName: string;
  iconName: string;
  colorCode: string;
  description: string;
}

interface ChapterData {
  chapterNumber: number;
  chapterTitle: string;
  description: string;
  estimatedDurationMinutes: number;
  learningObjectives?: string;
}

interface TopicData {
  topicTitle: string;
  content: string;
  keyConcepts: string;
  estimatedDurationMinutes: number;
  difficultyLevel: number;
  aiTeachingPrompt: string;
}

interface ContentBlockData {
  blockType: BlockType;
  content: string;
  aiExplanation?: string;
  sequenceOrder: number;
}

interface QuestionData {
  questionType: QuestionType;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  marks: number;
  sequenceOrder: number;
  difficultyLevel: string;
}

// ==================== SUBJECT DEFINITIONS ====================

const SUBJECTS_BY_CLASS: Record<string, SubjectData[]> = {
  '6': [
    { subjectName: 'Mathematics', displayName: 'Mathematics', iconName: 'calculator', colorCode: '#4F46E5', description: 'Class 6 Mathematics - Numbers, Algebra, Geometry basics' },
    { subjectName: 'Science', displayName: 'Science', iconName: 'flask', colorCode: '#10B981', description: 'Class 6 Science - Introduction to Physics, Chemistry, Biology' },
    { subjectName: 'English', displayName: 'English', iconName: 'book-open', colorCode: '#F59E0B', description: 'Class 6 English - Language and Literature' },
    { subjectName: 'Hindi', displayName: 'Hindi', iconName: 'type', colorCode: '#EF4444', description: 'Class 6 Hindi - भाषा और साहित्य' },
    { subjectName: 'Marathi', displayName: 'Marathi', iconName: 'file-text', colorCode: '#8B5CF6', description: 'Class 6 Marathi - भाषा आणि साहित्य' },
    { subjectName: 'Social Science', displayName: 'Social Science', iconName: 'globe', colorCode: '#06B6D4', description: 'Class 6 Social Science - History, Geography, Civics' },
  ],
  '7': [
    { subjectName: 'Mathematics', displayName: 'Mathematics', iconName: 'calculator', colorCode: '#4F46E5', description: 'Class 7 Mathematics - Integers, Fractions, Geometry' },
    { subjectName: 'Science', displayName: 'Science', iconName: 'flask', colorCode: '#10B981', description: 'Class 7 Science - Physics, Chemistry, Biology' },
    { subjectName: 'English', displayName: 'English', iconName: 'book-open', colorCode: '#F59E0B', description: 'Class 7 English - Language and Literature' },
    { subjectName: 'Hindi', displayName: 'Hindi', iconName: 'type', colorCode: '#EF4444', description: 'Class 7 Hindi - भाषा और साहित्य' },
    { subjectName: 'Marathi', displayName: 'Marathi', iconName: 'file-text', colorCode: '#8B5CF6', description: 'Class 7 Marathi - भाषा आणि साहित्य' },
    { subjectName: 'Social Science', displayName: 'Social Science', iconName: 'globe', colorCode: '#06B6D4', description: 'Class 7 Social Science - History, Geography, Civics' },
  ],
  '8': [
    { subjectName: 'Mathematics', displayName: 'Mathematics', iconName: 'calculator', colorCode: '#4F46E5', description: 'Class 8 Mathematics - Algebra, Geometry, Data Handling' },
    { subjectName: 'Science', displayName: 'Science', iconName: 'flask', colorCode: '#10B981', description: 'Class 8 Science - Physics, Chemistry, Biology' },
    { subjectName: 'English', displayName: 'English', iconName: 'book-open', colorCode: '#F59E0B', description: 'Class 8 English - Language and Literature' },
    { subjectName: 'Hindi', displayName: 'Hindi', iconName: 'type', colorCode: '#EF4444', description: 'Class 8 Hindi - भाषा और साहित्य' },
    { subjectName: 'Marathi', displayName: 'Marathi', iconName: 'file-text', colorCode: '#8B5CF6', description: 'Class 8 Marathi - भाषा आणि साहित्य' },
    { subjectName: 'Social Science', displayName: 'Social Science', iconName: 'globe', colorCode: '#06B6D4', description: 'Class 8 Social Science - History, Geography, Civics' },
  ],
  '9': [
    { subjectName: 'Mathematics', displayName: 'Mathematics', iconName: 'calculator', colorCode: '#4F46E5', description: 'Class 9 Mathematics - Number Systems, Polynomials, Geometry' },
    { subjectName: 'Science', displayName: 'Science', iconName: 'flask', colorCode: '#10B981', description: 'Class 9 Science - Physics, Chemistry, Biology' },
    { subjectName: 'English', displayName: 'English', iconName: 'book-open', colorCode: '#F59E0B', description: 'Class 9 English - Language and Literature' },
    { subjectName: 'Hindi', displayName: 'Hindi', iconName: 'type', colorCode: '#EF4444', description: 'Class 9 Hindi - भाषा और साहित्य' },
    { subjectName: 'Marathi', displayName: 'Marathi', iconName: 'file-text', colorCode: '#8B5CF6', description: 'Class 9 Marathi - भाषा आणि साहित्य' },
    { subjectName: 'Social Science', displayName: 'Social Science', iconName: 'globe', colorCode: '#06B6D4', description: 'Class 9 Social Science - History, Geography, Civics, Economics' },
  ],
  '10': [
    { subjectName: 'Mathematics', displayName: 'Mathematics', iconName: 'calculator', colorCode: '#4F46E5', description: 'Class 10 Mathematics - Real Numbers, Polynomials, Trigonometry' },
    { subjectName: 'Science', displayName: 'Science', iconName: 'flask', colorCode: '#10B981', description: 'Class 10 Science - Physics, Chemistry, Biology' },
    { subjectName: 'English', displayName: 'English', iconName: 'book-open', colorCode: '#F59E0B', description: 'Class 10 English - Language and Literature' },
    { subjectName: 'Hindi', displayName: 'Hindi', iconName: 'type', colorCode: '#EF4444', description: 'Class 10 Hindi - भाषा और साहित्य' },
    { subjectName: 'Marathi', displayName: 'Marathi', iconName: 'file-text', colorCode: '#8B5CF6', description: 'Class 10 Marathi - भाषा आणि साहित्य' },
    { subjectName: 'Social Science', displayName: 'Social Science', iconName: 'globe', colorCode: '#06B6D4', description: 'Class 10 Social Science - History, Geography, Political Science, Economics' },
  ],
  '11': [
    { subjectName: 'Mathematics', displayName: 'Mathematics', iconName: 'calculator', colorCode: '#4F46E5', description: 'Class 11 Mathematics - Sets, Relations, Trigonometry, Calculus' },
    { subjectName: 'Physics', displayName: 'Physics', iconName: 'zap', colorCode: '#10B981', description: 'Class 11 Physics - Mechanics, Thermodynamics, Waves' },
    { subjectName: 'Chemistry', displayName: 'Chemistry', iconName: 'flask', colorCode: '#F59E0B', description: 'Class 11 Chemistry - Atomic Structure, Chemical Bonding, Organic Chemistry' },
    { subjectName: 'Biology', displayName: 'Biology', iconName: 'heart', colorCode: '#EF4444', description: 'Class 11 Biology - Cell Biology, Plant Physiology, Human Physiology' },
    { subjectName: 'English', displayName: 'English', iconName: 'book-open', colorCode: '#8B5CF6', description: 'Class 11 English - Language and Literature' },
    { subjectName: 'Computer Science', displayName: 'Computer Science', iconName: 'code', colorCode: '#06B6D4', description: 'Class 11 Computer Science - Programming, Data Structures' },
  ],
  '12': [
    { subjectName: 'Mathematics', displayName: 'Mathematics', iconName: 'calculator', colorCode: '#4F46E5', description: 'Class 12 Mathematics - Calculus, Vectors, Probability' },
    { subjectName: 'Physics', displayName: 'Physics', iconName: 'zap', colorCode: '#10B981', description: 'Class 12 Physics - Electromagnetism, Optics, Modern Physics' },
    { subjectName: 'Chemistry', displayName: 'Chemistry', iconName: 'flask', colorCode: '#F59E0B', description: 'Class 12 Chemistry - Solutions, Electrochemistry, Organic Chemistry' },
    { subjectName: 'Biology', displayName: 'Biology', iconName: 'heart', colorCode: '#EF4444', description: 'Class 12 Biology - Genetics, Evolution, Biotechnology' },
    { subjectName: 'English', displayName: 'English', iconName: 'book-open', colorCode: '#8B5CF6', description: 'Class 12 English - Language and Literature' },
    { subjectName: 'Computer Science', displayName: 'Computer Science', iconName: 'code', colorCode: '#06B6D4', description: 'Class 12 Computer Science - Python, Databases, Networking' },
  ],
};

// ==================== CHAPTER DEFINITIONS ====================

const CHAPTERS_DATA: Record<string, Record<string, ChapterData[]>> = {
  // CLASS 6
  '6': {
    'Mathematics': [
      { chapterNumber: 1, chapterTitle: 'Knowing Our Numbers', description: 'Large numbers, estimation, and place value', estimatedDurationMinutes: 180, learningObjectives: 'Understand large numbers, compare and estimate' },
      { chapterNumber: 2, chapterTitle: 'Whole Numbers', description: 'Properties of whole numbers', estimatedDurationMinutes: 150, learningObjectives: 'Understand whole numbers and their properties' },
      { chapterNumber: 3, chapterTitle: 'Playing with Numbers', description: 'Factors, multiples, divisibility', estimatedDurationMinutes: 200, learningObjectives: 'Find factors, multiples, HCF and LCM' },
      { chapterNumber: 4, chapterTitle: 'Basic Geometrical Ideas', description: 'Points, lines, curves, polygons', estimatedDurationMinutes: 160, learningObjectives: 'Understand basic geometry concepts' },
      { chapterNumber: 5, chapterTitle: 'Understanding Elementary Shapes', description: 'Measuring angles, types of angles', estimatedDurationMinutes: 180, learningObjectives: 'Measure and classify angles and shapes' },
      { chapterNumber: 6, chapterTitle: 'Integers', description: 'Introduction to integers', estimatedDurationMinutes: 170, learningObjectives: 'Understand positive and negative integers' },
      { chapterNumber: 7, chapterTitle: 'Fractions', description: 'Types of fractions and operations', estimatedDurationMinutes: 200, learningObjectives: 'Work with fractions' },
      { chapterNumber: 8, chapterTitle: 'Decimals', description: 'Decimal numbers and operations', estimatedDurationMinutes: 180, learningObjectives: 'Understand and work with decimals' },
      { chapterNumber: 9, chapterTitle: 'Data Handling', description: 'Organizing and representing data', estimatedDurationMinutes: 150, learningObjectives: 'Collect, organize and interpret data' },
      { chapterNumber: 10, chapterTitle: 'Mensuration', description: 'Perimeter and area', estimatedDurationMinutes: 190, learningObjectives: 'Calculate perimeter and area' },
    ],
    'Science': [
      { chapterNumber: 1, chapterTitle: 'Food: Where Does It Come From?', description: 'Sources of food', estimatedDurationMinutes: 120, learningObjectives: 'Understand food sources and types' },
      { chapterNumber: 2, chapterTitle: 'Components of Food', description: 'Nutrients in food', estimatedDurationMinutes: 150, learningObjectives: 'Identify nutrients and their importance' },
      { chapterNumber: 3, chapterTitle: 'Fibre to Fabric', description: 'Natural and synthetic fibres', estimatedDurationMinutes: 140, learningObjectives: 'Understand fibres and fabric making' },
      { chapterNumber: 4, chapterTitle: 'Sorting Materials into Groups', description: 'Classification of materials', estimatedDurationMinutes: 130, learningObjectives: 'Classify materials based on properties' },
      { chapterNumber: 5, chapterTitle: 'Separation of Substances', description: 'Methods of separation', estimatedDurationMinutes: 160, learningObjectives: 'Understand separation techniques' },
      { chapterNumber: 6, chapterTitle: 'Changes Around Us', description: 'Physical and chemical changes', estimatedDurationMinutes: 150, learningObjectives: 'Differentiate types of changes' },
      { chapterNumber: 7, chapterTitle: 'Getting to Know Plants', description: 'Plant structure and types', estimatedDurationMinutes: 170, learningObjectives: 'Understand plant parts and functions' },
      { chapterNumber: 8, chapterTitle: 'Body Movements', description: 'Skeletal and muscular system', estimatedDurationMinutes: 160, learningObjectives: 'Understand human body movement' },
      { chapterNumber: 9, chapterTitle: 'The Living Organisms', description: 'Characteristics of living things', estimatedDurationMinutes: 140, learningObjectives: 'Identify characteristics of living organisms' },
      { chapterNumber: 10, chapterTitle: 'Motion and Measurement', description: 'Types of motion and units', estimatedDurationMinutes: 150, learningObjectives: 'Understand motion and measurement' },
    ],
    'English': [
      { chapterNumber: 1, chapterTitle: 'Who Did Patrick\'s Homework?', description: 'Story about a magical elf', estimatedDurationMinutes: 120 },
      { chapterNumber: 2, chapterTitle: 'How the Dog Found Himself a New Master', description: 'Fable about loyalty', estimatedDurationMinutes: 110 },
      { chapterNumber: 3, chapterTitle: 'Taro\'s Reward', description: 'Japanese folk tale', estimatedDurationMinutes: 130 },
      { chapterNumber: 4, chapterTitle: 'An Indian-American Woman in Space', description: 'Kalpana Chawla\'s story', estimatedDurationMinutes: 150 },
      { chapterNumber: 5, chapterTitle: 'A Different Kind of School', description: 'Story about inclusive education', estimatedDurationMinutes: 140 },
      { chapterNumber: 6, chapterTitle: 'Who I Am', description: 'Self-discovery poems', estimatedDurationMinutes: 100 },
      { chapterNumber: 7, chapterTitle: 'Fair Play', description: 'Story about honesty', estimatedDurationMinutes: 130 },
      { chapterNumber: 8, chapterTitle: 'A Game of Chance', description: 'Story from village fair', estimatedDurationMinutes: 120 },
    ],
    'Hindi': [
      { chapterNumber: 1, chapterTitle: 'वह चिड़िया जो', description: 'कविता', estimatedDurationMinutes: 90 },
      { chapterNumber: 2, chapterTitle: 'बचपन', description: 'आत्मकथा', estimatedDurationMinutes: 120 },
      { chapterNumber: 3, chapterTitle: 'नादान दोस्त', description: 'कहानी', estimatedDurationMinutes: 130 },
      { chapterNumber: 4, chapterTitle: 'चाँद से थोड़ी सी गप्पें', description: 'कविता', estimatedDurationMinutes: 100 },
      { chapterNumber: 5, chapterTitle: 'अक्षरों का महत्व', description: 'निबंध', estimatedDurationMinutes: 110 },
      { chapterNumber: 6, chapterTitle: 'पार नज़र के', description: 'कहानी', estimatedDurationMinutes: 140 },
      { chapterNumber: 7, chapterTitle: 'साथी हाथ बढ़ाना', description: 'कविता', estimatedDurationMinutes: 90 },
      { chapterNumber: 8, chapterTitle: 'ऐसे-ऐसे', description: 'एकांकी', estimatedDurationMinutes: 150 },
    ],
    'Marathi': [
      { chapterNumber: 1, chapterTitle: 'आमची शाळा', description: 'वर्णन', estimatedDurationMinutes: 90 },
      { chapterNumber: 2, chapterTitle: 'माझे बाबा', description: 'कविता', estimatedDurationMinutes: 80 },
      { chapterNumber: 3, chapterTitle: 'झाडाची गोष्ट', description: 'कहानी', estimatedDurationMinutes: 120 },
      { chapterNumber: 4, chapterTitle: 'सूर्य आणि वारा', description: 'बोधकथा', estimatedDurationMinutes: 100 },
      { chapterNumber: 5, chapterTitle: 'माझा देश', description: 'कविता', estimatedDurationMinutes: 85 },
      { chapterNumber: 6, chapterTitle: 'चतुर कोल्हा', description: 'कहानी', estimatedDurationMinutes: 110 },
      { chapterNumber: 7, chapterTitle: 'निसर्ग सौंदर्य', description: 'वर्णन', estimatedDurationMinutes: 100 },
      { chapterNumber: 8, chapterTitle: 'आईची माया', description: 'कविता', estimatedDurationMinutes: 90 },
    ],
    'Social Science': [
      { chapterNumber: 1, chapterTitle: 'What, Where, How and When?', description: 'Introduction to History', estimatedDurationMinutes: 120 },
      { chapterNumber: 2, chapterTitle: 'On The Trail of the Earliest People', description: 'Early humans', estimatedDurationMinutes: 150 },
      { chapterNumber: 3, chapterTitle: 'From Gathering to Growing Food', description: 'Agriculture development', estimatedDurationMinutes: 140 },
      { chapterNumber: 4, chapterTitle: 'The Earth in the Solar System', description: 'Geography basics', estimatedDurationMinutes: 160 },
      { chapterNumber: 5, chapterTitle: 'Major Domains of the Earth', description: 'Lithosphere, Hydrosphere, Atmosphere', estimatedDurationMinutes: 170 },
      { chapterNumber: 6, chapterTitle: 'Understanding Diversity', description: 'Indian diversity', estimatedDurationMinutes: 130 },
      { chapterNumber: 7, chapterTitle: 'Diversity and Discrimination', description: 'Social issues', estimatedDurationMinutes: 140 },
      { chapterNumber: 8, chapterTitle: 'What is Government?', description: 'Civics basics', estimatedDurationMinutes: 120 },
    ],
  },
  
  // CLASS 7
  '7': {
    'Mathematics': [
      { chapterNumber: 1, chapterTitle: 'Integers', description: 'Operations on integers', estimatedDurationMinutes: 180, learningObjectives: 'Perform operations on integers' },
      { chapterNumber: 2, chapterTitle: 'Fractions and Decimals', description: 'Operations on fractions and decimals', estimatedDurationMinutes: 200, learningObjectives: 'Work with fractions and decimals' },
      { chapterNumber: 3, chapterTitle: 'Data Handling', description: 'Mean, median, mode, bar graphs', estimatedDurationMinutes: 170, learningObjectives: 'Calculate central tendencies' },
      { chapterNumber: 4, chapterTitle: 'Simple Equations', description: 'Solving linear equations', estimatedDurationMinutes: 160, learningObjectives: 'Solve simple equations' },
      { chapterNumber: 5, chapterTitle: 'Lines and Angles', description: 'Types of angles and parallel lines', estimatedDurationMinutes: 180, learningObjectives: 'Understand angle relationships' },
      { chapterNumber: 6, chapterTitle: 'The Triangle and Its Properties', description: 'Triangle properties and theorems', estimatedDurationMinutes: 200, learningObjectives: 'Apply triangle properties' },
      { chapterNumber: 7, chapterTitle: 'Congruence of Triangles', description: 'Congruence criteria', estimatedDurationMinutes: 180, learningObjectives: 'Prove triangle congruence' },
      { chapterNumber: 8, chapterTitle: 'Comparing Quantities', description: 'Ratios, percentages, profit loss', estimatedDurationMinutes: 190, learningObjectives: 'Solve percentage problems' },
      { chapterNumber: 9, chapterTitle: 'Rational Numbers', description: 'Introduction to rational numbers', estimatedDurationMinutes: 170, learningObjectives: 'Understand rational numbers' },
      { chapterNumber: 10, chapterTitle: 'Perimeter and Area', description: 'Area of triangles, circles', estimatedDurationMinutes: 200, learningObjectives: 'Calculate area and perimeter' },
    ],
    'Science': [
      { chapterNumber: 1, chapterTitle: 'Nutrition in Plants', description: 'Photosynthesis and plant nutrition', estimatedDurationMinutes: 160 },
      { chapterNumber: 2, chapterTitle: 'Nutrition in Animals', description: 'Digestive system', estimatedDurationMinutes: 170 },
      { chapterNumber: 3, chapterTitle: 'Fibre to Fabric', description: 'Animal fibres - wool and silk', estimatedDurationMinutes: 140 },
      { chapterNumber: 4, chapterTitle: 'Heat', description: 'Temperature and heat transfer', estimatedDurationMinutes: 180 },
      { chapterNumber: 5, chapterTitle: 'Acids, Bases and Salts', description: 'Introduction to acids and bases', estimatedDurationMinutes: 170 },
      { chapterNumber: 6, chapterTitle: 'Physical and Chemical Changes', description: 'Types of changes', estimatedDurationMinutes: 150 },
      { chapterNumber: 7, chapterTitle: 'Weather, Climate and Adaptations', description: 'Climate and animal adaptations', estimatedDurationMinutes: 160 },
      { chapterNumber: 8, chapterTitle: 'Winds, Storms and Cyclones', description: 'Air pressure and wind', estimatedDurationMinutes: 150 },
      { chapterNumber: 9, chapterTitle: 'Soil', description: 'Soil profile and types', estimatedDurationMinutes: 140 },
      { chapterNumber: 10, chapterTitle: 'Respiration in Organisms', description: 'Breathing and respiration', estimatedDurationMinutes: 170 },
    ],
    'English': [
      { chapterNumber: 1, chapterTitle: 'Three Questions', description: 'Leo Tolstoy\'s story', estimatedDurationMinutes: 130 },
      { chapterNumber: 2, chapterTitle: 'A Gift of Chappals', description: 'Family story', estimatedDurationMinutes: 140 },
      { chapterNumber: 3, chapterTitle: 'Gopal and the Hilsa Fish', description: 'Comic story', estimatedDurationMinutes: 120 },
      { chapterNumber: 4, chapterTitle: 'The Ashes That Made Trees Bloom', description: 'Japanese folk tale', estimatedDurationMinutes: 150 },
      { chapterNumber: 5, chapterTitle: 'Quality', description: 'Story by John Galsworthy', estimatedDurationMinutes: 140 },
      { chapterNumber: 6, chapterTitle: 'Expert Detectives', description: 'Mystery story', estimatedDurationMinutes: 130 },
      { chapterNumber: 7, chapterTitle: 'The Invention of Vita-Wonk', description: 'Roald Dahl excerpt', estimatedDurationMinutes: 120 },
      { chapterNumber: 8, chapterTitle: 'Fire: Friend and Foe', description: 'Informative text', estimatedDurationMinutes: 140 },
    ],
    'Hindi': [
      { chapterNumber: 1, chapterTitle: 'हम पंछी उन्मुक्त गगन के', description: 'कविता', estimatedDurationMinutes: 100 },
      { chapterNumber: 2, chapterTitle: 'दादी माँ', description: 'कहानी', estimatedDurationMinutes: 130 },
      { chapterNumber: 3, chapterTitle: 'हिमालय की बेटियाँ', description: 'यात्रा वृतांत', estimatedDurationMinutes: 140 },
      { chapterNumber: 4, chapterTitle: 'कठपुतली', description: 'कविता', estimatedDurationMinutes: 90 },
      { chapterNumber: 5, chapterTitle: 'मिठाईवाला', description: 'कहानी', estimatedDurationMinutes: 150 },
      { chapterNumber: 6, chapterTitle: 'रक्त और हमारा शरीर', description: 'निबंध', estimatedDurationMinutes: 120 },
      { chapterNumber: 7, chapterTitle: 'पापा खो गए', description: 'नाटक', estimatedDurationMinutes: 160 },
      { chapterNumber: 8, chapterTitle: 'शाम - एक किसान', description: 'कविता', estimatedDurationMinutes: 100 },
    ],
    'Marathi': [
      { chapterNumber: 1, chapterTitle: 'जय जय महाराष्ट्र माझा', description: 'कविता', estimatedDurationMinutes: 90 },
      { chapterNumber: 2, chapterTitle: 'माझी आई', description: 'वर्णन', estimatedDurationMinutes: 100 },
      { chapterNumber: 3, chapterTitle: 'संत तुकाराम', description: 'चरित्र', estimatedDurationMinutes: 140 },
      { chapterNumber: 4, chapterTitle: 'पाऊस आला', description: 'कविता', estimatedDurationMinutes: 85 },
      { chapterNumber: 5, chapterTitle: 'शिवाजी महाराज', description: 'ऐतिहासिक', estimatedDurationMinutes: 160 },
      { chapterNumber: 6, chapterTitle: 'माझे गाव', description: 'वर्णन', estimatedDurationMinutes: 110 },
      { chapterNumber: 7, chapterTitle: 'एकी हेच बळ', description: 'बोधकथा', estimatedDurationMinutes: 100 },
      { chapterNumber: 8, chapterTitle: 'विज्ञान आणि आपण', description: 'निबंध', estimatedDurationMinutes: 120 },
    ],
    'Social Science': [
      { chapterNumber: 1, chapterTitle: 'Tracing Changes Through a Thousand Years', description: 'Medieval India', estimatedDurationMinutes: 150 },
      { chapterNumber: 2, chapterTitle: 'New Kings and Kingdoms', description: 'Rise of new dynasties', estimatedDurationMinutes: 160 },
      { chapterNumber: 3, chapterTitle: 'The Delhi Sultans', description: 'Delhi Sultanate', estimatedDurationMinutes: 170 },
      { chapterNumber: 4, chapterTitle: 'Environment', description: 'Natural environment', estimatedDurationMinutes: 140 },
      { chapterNumber: 5, chapterTitle: 'Inside Our Earth', description: 'Earth\'s structure', estimatedDurationMinutes: 150 },
      { chapterNumber: 6, chapterTitle: 'Our Changing Earth', description: 'Geological changes', estimatedDurationMinutes: 140 },
      { chapterNumber: 7, chapterTitle: 'On Equality', description: 'Equality in democracy', estimatedDurationMinutes: 130 },
      { chapterNumber: 8, chapterTitle: 'Role of Government in Health', description: 'Public health', estimatedDurationMinutes: 140 },
    ],
  },
  
  // CLASS 8
  '8': {
    'Mathematics': [
      { chapterNumber: 1, chapterTitle: 'Rational Numbers', description: 'Properties and operations on rational numbers', estimatedDurationMinutes: 180, learningObjectives: 'Understand rational numbers and their properties' },
      { chapterNumber: 2, chapterTitle: 'Linear Equations in One Variable', description: 'Solving linear equations', estimatedDurationMinutes: 150, learningObjectives: 'Solve linear equations and word problems' },
      { chapterNumber: 3, chapterTitle: 'Understanding Quadrilaterals', description: 'Properties of quadrilaterals', estimatedDurationMinutes: 200, learningObjectives: 'Identify and classify quadrilaterals' },
      { chapterNumber: 4, chapterTitle: 'Practical Geometry', description: 'Construction of quadrilaterals', estimatedDurationMinutes: 180, learningObjectives: 'Construct quadrilaterals' },
      { chapterNumber: 5, chapterTitle: 'Data Handling', description: 'Organizing and interpreting data', estimatedDurationMinutes: 160, learningObjectives: 'Create and interpret graphs' },
      { chapterNumber: 6, chapterTitle: 'Squares and Square Roots', description: 'Perfect squares and square roots', estimatedDurationMinutes: 170, learningObjectives: 'Find squares and square roots' },
      { chapterNumber: 7, chapterTitle: 'Cubes and Cube Roots', description: 'Perfect cubes and cube roots', estimatedDurationMinutes: 150, learningObjectives: 'Find cubes and cube roots' },
      { chapterNumber: 8, chapterTitle: 'Comparing Quantities', description: 'Percentages, profit, loss, interest', estimatedDurationMinutes: 200, learningObjectives: 'Solve problems on percentages and interest' },
      { chapterNumber: 9, chapterTitle: 'Algebraic Expressions and Identities', description: 'Algebraic identities', estimatedDurationMinutes: 190, learningObjectives: 'Use algebraic identities' },
      { chapterNumber: 10, chapterTitle: 'Mensuration', description: 'Area and volume', estimatedDurationMinutes: 220, learningObjectives: 'Calculate area, surface area and volume' },
    ],
    'Science': [
      { chapterNumber: 1, chapterTitle: 'Crop Production and Management', description: 'Agricultural practices', estimatedDurationMinutes: 160 },
      { chapterNumber: 2, chapterTitle: 'Microorganisms: Friend and Foe', description: 'Types of microorganisms', estimatedDurationMinutes: 170 },
      { chapterNumber: 3, chapterTitle: 'Synthetic Fibres and Plastics', description: 'Man-made materials', estimatedDurationMinutes: 150 },
      { chapterNumber: 4, chapterTitle: 'Materials: Metals and Non-Metals', description: 'Properties of metals', estimatedDurationMinutes: 180 },
      { chapterNumber: 5, chapterTitle: 'Coal and Petroleum', description: 'Fossil fuels', estimatedDurationMinutes: 140 },
      { chapterNumber: 6, chapterTitle: 'Combustion and Flame', description: 'Burning and flames', estimatedDurationMinutes: 150 },
      { chapterNumber: 7, chapterTitle: 'Conservation of Plants and Animals', description: 'Biodiversity conservation', estimatedDurationMinutes: 160 },
      { chapterNumber: 8, chapterTitle: 'Cell - Structure and Functions', description: 'Cell biology basics', estimatedDurationMinutes: 200 },
      { chapterNumber: 9, chapterTitle: 'Reproduction in Animals', description: 'Animal reproduction', estimatedDurationMinutes: 170 },
      { chapterNumber: 10, chapterTitle: 'Force and Pressure', description: 'Types of forces', estimatedDurationMinutes: 180 },
      { chapterNumber: 11, chapterTitle: 'Friction', description: 'Friction and its effects', estimatedDurationMinutes: 150 },
      { chapterNumber: 12, chapterTitle: 'Sound', description: 'Production of sound', estimatedDurationMinutes: 170 },
      { chapterNumber: 13, chapterTitle: 'Chemical Effects of Electric Current', description: 'Electrolysis', estimatedDurationMinutes: 160 },
      { chapterNumber: 14, chapterTitle: 'Some Natural Phenomena', description: 'Lightning and earthquakes', estimatedDurationMinutes: 150 },
      { chapterNumber: 15, chapterTitle: 'Light', description: 'Reflection and refraction', estimatedDurationMinutes: 180 },
      { chapterNumber: 16, chapterTitle: 'Stars and The Solar System', description: 'Astronomy basics', estimatedDurationMinutes: 170 },
    ],
    'English': [
      { chapterNumber: 1, chapterTitle: 'The Best Christmas Present', description: 'Story about family', estimatedDurationMinutes: 130 },
      { chapterNumber: 2, chapterTitle: 'The Tsunami', description: 'Disaster narrative', estimatedDurationMinutes: 150 },
      { chapterNumber: 3, chapterTitle: 'Glimpses of the Past', description: 'Indian history comic', estimatedDurationMinutes: 160 },
      { chapterNumber: 4, chapterTitle: 'Bepin Choudhury\'s Lapse of Memory', description: 'Satyajit Ray story', estimatedDurationMinutes: 140 },
      { chapterNumber: 5, chapterTitle: 'The Summit Within', description: 'Mountain climbing', estimatedDurationMinutes: 150 },
      { chapterNumber: 6, chapterTitle: 'This is Jody\'s Fawn', description: 'Animal story', estimatedDurationMinutes: 140 },
      { chapterNumber: 7, chapterTitle: 'A Visit to Cambridge', description: 'Meeting Stephen Hawking', estimatedDurationMinutes: 150 },
      { chapterNumber: 8, chapterTitle: 'A Short Monsoon Diary', description: 'Nature writing', estimatedDurationMinutes: 130 },
    ],
    'Hindi': [
      { chapterNumber: 1, chapterTitle: 'ध्वनि', description: 'कविता', estimatedDurationMinutes: 90 },
      { chapterNumber: 2, chapterTitle: 'लाख की चूड़ियाँ', description: 'कहानी', estimatedDurationMinutes: 140 },
      { chapterNumber: 3, chapterTitle: 'बस की यात्रा', description: 'व्यंग्य', estimatedDurationMinutes: 130 },
      { chapterNumber: 4, chapterTitle: 'दीवानों की हस्ती', description: 'कविता', estimatedDurationMinutes: 100 },
      { chapterNumber: 5, chapterTitle: 'चिट्ठियों की अनूठी दुनिया', description: 'निबंध', estimatedDurationMinutes: 120 },
      { chapterNumber: 6, chapterTitle: 'भगवान के डाकिये', description: 'कविता', estimatedDurationMinutes: 90 },
      { chapterNumber: 7, chapterTitle: 'क्या निराश हुआ जाए', description: 'निबंध', estimatedDurationMinutes: 130 },
      { chapterNumber: 8, chapterTitle: 'यह सबसे कठिन समय नहीं', description: 'कविता', estimatedDurationMinutes: 100 },
    ],
    'Marathi': [
      { chapterNumber: 1, chapterTitle: 'माझी शाळा', description: 'कविता', estimatedDurationMinutes: 80 },
      { chapterNumber: 2, chapterTitle: 'सावित्रीबाई फुले', description: 'जीवनी', estimatedDurationMinutes: 150 },
      { chapterNumber: 3, chapterTitle: 'निसर्गाचे गाणे', description: 'कविता', estimatedDurationMinutes: 90 },
      { chapterNumber: 4, chapterTitle: 'छत्रपती शिवाजी महाराज', description: 'ऐतिहासिक', estimatedDurationMinutes: 180 },
      { chapterNumber: 5, chapterTitle: 'आई', description: 'कविता', estimatedDurationMinutes: 75 },
      { chapterNumber: 6, chapterTitle: 'माझे गाव', description: 'वर्णन', estimatedDurationMinutes: 100 },
      { chapterNumber: 7, chapterTitle: 'संत तुकाराम', description: 'अभंग', estimatedDurationMinutes: 110 },
      { chapterNumber: 8, chapterTitle: 'विज्ञान आणि तंत्रज्ञान', description: 'निबंध', estimatedDurationMinutes: 120 },
    ],
    'Social Science': [
      { chapterNumber: 1, chapterTitle: 'How, When and Where', description: 'Historical sources', estimatedDurationMinutes: 130 },
      { chapterNumber: 2, chapterTitle: 'From Trade to Territory', description: 'British expansion', estimatedDurationMinutes: 160 },
      { chapterNumber: 3, chapterTitle: 'Ruling the Countryside', description: 'British revenue systems', estimatedDurationMinutes: 150 },
      { chapterNumber: 4, chapterTitle: 'Resources', description: 'Types of resources', estimatedDurationMinutes: 140 },
      { chapterNumber: 5, chapterTitle: 'Land, Soil, Water', description: 'Natural resources', estimatedDurationMinutes: 150 },
      { chapterNumber: 6, chapterTitle: 'Agriculture', description: 'Farming in India', estimatedDurationMinutes: 160 },
      { chapterNumber: 7, chapterTitle: 'The Indian Constitution', description: 'Constitutional framework', estimatedDurationMinutes: 180 },
      { chapterNumber: 8, chapterTitle: 'Understanding Secularism', description: 'Secular principles', estimatedDurationMinutes: 140 },
    ],
  },
  
  // CLASS 9
  '9': {
    'Mathematics': [
      { chapterNumber: 1, chapterTitle: 'Number Systems', description: 'Real numbers and their representations', estimatedDurationMinutes: 200, learningObjectives: 'Understand number systems and irrational numbers' },
      { chapterNumber: 2, chapterTitle: 'Polynomials', description: 'Polynomials and their zeroes', estimatedDurationMinutes: 180, learningObjectives: 'Work with polynomials and factorization' },
      { chapterNumber: 3, chapterTitle: 'Coordinate Geometry', description: 'Cartesian coordinate system', estimatedDurationMinutes: 160, learningObjectives: 'Plot points and understand coordinates' },
      { chapterNumber: 4, chapterTitle: 'Linear Equations in Two Variables', description: 'Graphs of linear equations', estimatedDurationMinutes: 180, learningObjectives: 'Solve and graph linear equations' },
      { chapterNumber: 5, chapterTitle: 'Introduction to Euclid\'s Geometry', description: 'Axioms and postulates', estimatedDurationMinutes: 150, learningObjectives: 'Understand Euclidean geometry basics' },
      { chapterNumber: 6, chapterTitle: 'Lines and Angles', description: 'Properties of lines and angles', estimatedDurationMinutes: 170, learningObjectives: 'Apply angle properties' },
      { chapterNumber: 7, chapterTitle: 'Triangles', description: 'Congruence and triangle properties', estimatedDurationMinutes: 200, learningObjectives: 'Prove triangle properties' },
      { chapterNumber: 8, chapterTitle: 'Quadrilaterals', description: 'Properties of quadrilaterals', estimatedDurationMinutes: 180, learningObjectives: 'Apply quadrilateral properties' },
      { chapterNumber: 9, chapterTitle: 'Areas of Parallelograms and Triangles', description: 'Area calculations', estimatedDurationMinutes: 160, learningObjectives: 'Calculate areas using properties' },
      { chapterNumber: 10, chapterTitle: 'Circles', description: 'Circle properties and theorems', estimatedDurationMinutes: 200, learningObjectives: 'Apply circle theorems' },
      { chapterNumber: 11, chapterTitle: 'Constructions', description: 'Geometric constructions', estimatedDurationMinutes: 150, learningObjectives: 'Perform geometric constructions' },
      { chapterNumber: 12, chapterTitle: 'Heron\'s Formula', description: 'Area of triangles', estimatedDurationMinutes: 140, learningObjectives: 'Apply Heron\'s formula' },
      { chapterNumber: 13, chapterTitle: 'Surface Areas and Volumes', description: 'Surface area and volume formulas', estimatedDurationMinutes: 220, learningObjectives: 'Calculate surface area and volume' },
      { chapterNumber: 14, chapterTitle: 'Statistics', description: 'Data representation and analysis', estimatedDurationMinutes: 180, learningObjectives: 'Organize and analyze data' },
      { chapterNumber: 15, chapterTitle: 'Probability', description: 'Introduction to probability', estimatedDurationMinutes: 160, learningObjectives: 'Calculate simple probabilities' },
    ],
    'Science': [
      { chapterNumber: 1, chapterTitle: 'Matter in Our Surroundings', description: 'States of matter', estimatedDurationMinutes: 180 },
      { chapterNumber: 2, chapterTitle: 'Is Matter Around Us Pure?', description: 'Mixtures and compounds', estimatedDurationMinutes: 190 },
      { chapterNumber: 3, chapterTitle: 'Atoms and Molecules', description: 'Atomic theory', estimatedDurationMinutes: 200 },
      { chapterNumber: 4, chapterTitle: 'Structure of the Atom', description: 'Atomic structure', estimatedDurationMinutes: 190 },
      { chapterNumber: 5, chapterTitle: 'The Fundamental Unit of Life', description: 'Cell structure', estimatedDurationMinutes: 200 },
      { chapterNumber: 6, chapterTitle: 'Tissues', description: 'Plant and animal tissues', estimatedDurationMinutes: 180 },
      { chapterNumber: 7, chapterTitle: 'Diversity in Living Organisms', description: 'Classification', estimatedDurationMinutes: 170 },
      { chapterNumber: 8, chapterTitle: 'Motion', description: 'Laws of motion', estimatedDurationMinutes: 200 },
      { chapterNumber: 9, chapterTitle: 'Force and Laws of Motion', description: 'Newton\'s laws', estimatedDurationMinutes: 210 },
      { chapterNumber: 10, chapterTitle: 'Gravitation', description: 'Universal gravitation', estimatedDurationMinutes: 190 },
      { chapterNumber: 11, chapterTitle: 'Work and Energy', description: 'Work, energy, power', estimatedDurationMinutes: 200 },
      { chapterNumber: 12, chapterTitle: 'Sound', description: 'Sound waves', estimatedDurationMinutes: 180 },
      { chapterNumber: 13, chapterTitle: 'Why Do We Fall Ill?', description: 'Health and diseases', estimatedDurationMinutes: 170 },
      { chapterNumber: 14, chapterTitle: 'Natural Resources', description: 'Conservation of resources', estimatedDurationMinutes: 160 },
      { chapterNumber: 15, chapterTitle: 'Improvement in Food Resources', description: 'Agriculture and animal husbandry', estimatedDurationMinutes: 170 },
    ],
    'English': [
      { chapterNumber: 1, chapterTitle: 'The Fun They Had', description: 'Science fiction story', estimatedDurationMinutes: 130 },
      { chapterNumber: 2, chapterTitle: 'The Sound of Music', description: 'Two musical journeys', estimatedDurationMinutes: 150 },
      { chapterNumber: 3, chapterTitle: 'The Little Girl', description: 'Father-daughter relationship', estimatedDurationMinutes: 140 },
      { chapterNumber: 4, chapterTitle: 'A Truly Beautiful Mind', description: 'Albert Einstein biography', estimatedDurationMinutes: 150 },
      { chapterNumber: 5, chapterTitle: 'The Snake and the Mirror', description: 'Humorous story', estimatedDurationMinutes: 130 },
      { chapterNumber: 6, chapterTitle: 'My Childhood', description: 'APJ Abdul Kalam autobiography', estimatedDurationMinutes: 160 },
      { chapterNumber: 7, chapterTitle: 'Packing', description: 'Humorous narrative', estimatedDurationMinutes: 140 },
      { chapterNumber: 8, chapterTitle: 'Reach for the Top', description: 'Santosh Yadav story', estimatedDurationMinutes: 150 },
    ],
    'Hindi': [
      { chapterNumber: 1, chapterTitle: 'दो बैलों की कथा', description: 'कहानी', estimatedDurationMinutes: 150 },
      { chapterNumber: 2, chapterTitle: 'ल्हासा की ओर', description: 'यात्रा वृतांत', estimatedDurationMinutes: 140 },
      { chapterNumber: 3, chapterTitle: 'उपभोक्तावाद की संस्कृति', description: 'निबंध', estimatedDurationMinutes: 130 },
      { chapterNumber: 4, chapterTitle: 'साँवले सपनों की याद', description: 'संस्मरण', estimatedDurationMinutes: 140 },
      { chapterNumber: 5, chapterTitle: 'नाना साहब की पुत्री', description: 'ऐतिहासिक', estimatedDurationMinutes: 160 },
      { chapterNumber: 6, chapterTitle: 'प्रेमचंद के फटे जूते', description: 'व्यंग्य', estimatedDurationMinutes: 120 },
      { chapterNumber: 7, chapterTitle: 'मेरे बचपन के दिन', description: 'आत्मकथा', estimatedDurationMinutes: 150 },
      { chapterNumber: 8, chapterTitle: 'एक कुत्ता और एक मैना', description: 'निबंध', estimatedDurationMinutes: 130 },
    ],
    'Marathi': [
      { chapterNumber: 1, chapterTitle: 'वसंत आला', description: 'कविता', estimatedDurationMinutes: 90 },
      { chapterNumber: 2, chapterTitle: 'लोकमान्य टिळक', description: 'जीवनी', estimatedDurationMinutes: 160 },
      { chapterNumber: 3, chapterTitle: 'माझा जन्म', description: 'आत्मकथा', estimatedDurationMinutes: 140 },
      { chapterNumber: 4, chapterTitle: 'गावाकडची माणसे', description: 'कथा', estimatedDurationMinutes: 130 },
      { chapterNumber: 5, chapterTitle: 'पावसाची सर', description: 'कविता', estimatedDurationMinutes: 85 },
      { chapterNumber: 6, chapterTitle: 'विज्ञानाचे युग', description: 'निबंध', estimatedDurationMinutes: 120 },
      { chapterNumber: 7, chapterTitle: 'माझे स्वप्न', description: 'कविता', estimatedDurationMinutes: 90 },
      { chapterNumber: 8, chapterTitle: 'मराठी भाषेचे महत्व', description: 'निबंध', estimatedDurationMinutes: 130 },
    ],
    'Social Science': [
      { chapterNumber: 1, chapterTitle: 'The French Revolution', description: 'French Revolution history', estimatedDurationMinutes: 180 },
      { chapterNumber: 2, chapterTitle: 'Socialism in Europe', description: 'Rise of socialism', estimatedDurationMinutes: 170 },
      { chapterNumber: 3, chapterTitle: 'Nazism and Rise of Hitler', description: 'World War II background', estimatedDurationMinutes: 190 },
      { chapterNumber: 4, chapterTitle: 'India - Size and Location', description: 'Geography of India', estimatedDurationMinutes: 140 },
      { chapterNumber: 5, chapterTitle: 'Physical Features of India', description: 'Mountains, plains, plateaus', estimatedDurationMinutes: 160 },
      { chapterNumber: 6, chapterTitle: 'Drainage', description: 'Indian rivers', estimatedDurationMinutes: 150 },
      { chapterNumber: 7, chapterTitle: 'What is Democracy?', description: 'Democracy concepts', estimatedDurationMinutes: 140 },
      { chapterNumber: 8, chapterTitle: 'Constitutional Design', description: 'Indian Constitution', estimatedDurationMinutes: 170 },
      { chapterNumber: 9, chapterTitle: 'Electoral Politics', description: 'Elections in India', estimatedDurationMinutes: 150 },
      { chapterNumber: 10, chapterTitle: 'The Story of Village Palampur', description: 'Economics introduction', estimatedDurationMinutes: 140 },
    ],
  },
  
  // CLASS 10
  '10': {
    'Mathematics': [
      { chapterNumber: 1, chapterTitle: 'Real Numbers', description: 'Euclid\'s division algorithm, fundamental theorem', estimatedDurationMinutes: 180, learningObjectives: 'Apply Euclid\'s algorithm and understand irrational numbers' },
      { chapterNumber: 2, chapterTitle: 'Polynomials', description: 'Zeroes and relationships', estimatedDurationMinutes: 170, learningObjectives: 'Find zeroes and verify relationships' },
      { chapterNumber: 3, chapterTitle: 'Pair of Linear Equations in Two Variables', description: 'Methods of solving', estimatedDurationMinutes: 200, learningObjectives: 'Solve linear equations by various methods' },
      { chapterNumber: 4, chapterTitle: 'Quadratic Equations', description: 'Solving quadratic equations', estimatedDurationMinutes: 190, learningObjectives: 'Solve quadratic equations and applications' },
      { chapterNumber: 5, chapterTitle: 'Arithmetic Progressions', description: 'AP formulas and applications', estimatedDurationMinutes: 180, learningObjectives: 'Apply AP formulas' },
      { chapterNumber: 6, chapterTitle: 'Triangles', description: 'Similarity of triangles', estimatedDurationMinutes: 200, learningObjectives: 'Prove and apply similarity theorems' },
      { chapterNumber: 7, chapterTitle: 'Coordinate Geometry', description: 'Distance and section formula', estimatedDurationMinutes: 180, learningObjectives: 'Apply coordinate geometry formulas' },
      { chapterNumber: 8, chapterTitle: 'Introduction to Trigonometry', description: 'Trigonometric ratios', estimatedDurationMinutes: 200, learningObjectives: 'Calculate trigonometric ratios' },
      { chapterNumber: 9, chapterTitle: 'Some Applications of Trigonometry', description: 'Heights and distances', estimatedDurationMinutes: 170, learningObjectives: 'Solve height and distance problems' },
      { chapterNumber: 10, chapterTitle: 'Circles', description: 'Tangent properties', estimatedDurationMinutes: 180, learningObjectives: 'Apply tangent theorems' },
      { chapterNumber: 11, chapterTitle: 'Constructions', description: 'Division of line segment, tangents', estimatedDurationMinutes: 150, learningObjectives: 'Perform advanced constructions' },
      { chapterNumber: 12, chapterTitle: 'Areas Related to Circles', description: 'Area of sectors and segments', estimatedDurationMinutes: 170, learningObjectives: 'Calculate areas of sectors and segments' },
      { chapterNumber: 13, chapterTitle: 'Surface Areas and Volumes', description: 'Combinations of solids', estimatedDurationMinutes: 200, learningObjectives: 'Calculate surface area and volume of combined solids' },
      { chapterNumber: 14, chapterTitle: 'Statistics', description: 'Mean, median, mode of grouped data', estimatedDurationMinutes: 190, learningObjectives: 'Calculate measures of central tendency' },
      { chapterNumber: 15, chapterTitle: 'Probability', description: 'Classical probability', estimatedDurationMinutes: 160, learningObjectives: 'Solve probability problems' },
    ],
    'Science': [
      { chapterNumber: 1, chapterTitle: 'Chemical Reactions and Equations', description: 'Types of reactions, balancing', estimatedDurationMinutes: 200 },
      { chapterNumber: 2, chapterTitle: 'Acids, Bases and Salts', description: 'Properties and reactions', estimatedDurationMinutes: 190 },
      { chapterNumber: 3, chapterTitle: 'Metals and Non-metals', description: 'Properties and reactions', estimatedDurationMinutes: 200 },
      { chapterNumber: 4, chapterTitle: 'Carbon and its Compounds', description: 'Organic chemistry basics', estimatedDurationMinutes: 220 },
      { chapterNumber: 5, chapterTitle: 'Periodic Classification of Elements', description: 'Periodic table', estimatedDurationMinutes: 180 },
      { chapterNumber: 6, chapterTitle: 'Life Processes', description: 'Nutrition, respiration, transport', estimatedDurationMinutes: 240 },
      { chapterNumber: 7, chapterTitle: 'Control and Coordination', description: 'Nervous and hormonal systems', estimatedDurationMinutes: 200 },
      { chapterNumber: 8, chapterTitle: 'How do Organisms Reproduce?', description: 'Reproduction methods', estimatedDurationMinutes: 210 },
      { chapterNumber: 9, chapterTitle: 'Heredity and Evolution', description: 'Genetics and evolution', estimatedDurationMinutes: 200 },
      { chapterNumber: 10, chapterTitle: 'Light - Reflection and Refraction', description: 'Mirrors and lenses', estimatedDurationMinutes: 220 },
      { chapterNumber: 11, chapterTitle: 'Human Eye and Colourful World', description: 'Eye defects and phenomena', estimatedDurationMinutes: 180 },
      { chapterNumber: 12, chapterTitle: 'Electricity', description: 'Electric circuits and power', estimatedDurationMinutes: 220 },
      { chapterNumber: 13, chapterTitle: 'Magnetic Effects of Electric Current', description: 'Electromagnetism', estimatedDurationMinutes: 200 },
      { chapterNumber: 14, chapterTitle: 'Sources of Energy', description: 'Conventional and alternative energy', estimatedDurationMinutes: 170 },
      { chapterNumber: 15, chapterTitle: 'Our Environment', description: 'Ecosystems and environmental issues', estimatedDurationMinutes: 160 },
      { chapterNumber: 16, chapterTitle: 'Management of Natural Resources', description: 'Conservation', estimatedDurationMinutes: 150 },
    ],
    'English': [
      { chapterNumber: 1, chapterTitle: 'A Letter to God', description: 'Faith and hope story', estimatedDurationMinutes: 140 },
      { chapterNumber: 2, chapterTitle: 'Nelson Mandela: Long Walk to Freedom', description: 'Autobiography excerpt', estimatedDurationMinutes: 160 },
      { chapterNumber: 3, chapterTitle: 'Two Stories about Flying', description: 'Adventure stories', estimatedDurationMinutes: 150 },
      { chapterNumber: 4, chapterTitle: 'From the Diary of Anne Frank', description: 'Holocaust diary', estimatedDurationMinutes: 160 },
      { chapterNumber: 5, chapterTitle: 'The Hundred Dresses - I', description: 'Bullying story', estimatedDurationMinutes: 140 },
      { chapterNumber: 6, chapterTitle: 'The Hundred Dresses - II', description: 'Conclusion', estimatedDurationMinutes: 140 },
      { chapterNumber: 7, chapterTitle: 'Glimpses of India', description: 'Three Indian stories', estimatedDurationMinutes: 180 },
      { chapterNumber: 8, chapterTitle: 'Mijbil the Otter', description: 'Pet story', estimatedDurationMinutes: 150 },
    ],
    'Hindi': [
      { chapterNumber: 1, chapterTitle: 'सूरदास के पद', description: 'भक्ति काव्य', estimatedDurationMinutes: 140 },
      { chapterNumber: 2, chapterTitle: 'राम-लक्ष्मण-परशुराम संवाद', description: 'रामचरितमानस', estimatedDurationMinutes: 160 },
      { chapterNumber: 3, chapterTitle: 'आत्मकथ्य', description: 'कविता', estimatedDurationMinutes: 120 },
      { chapterNumber: 4, chapterTitle: 'उत्साह और अट नहीं रही है', description: 'कविता', estimatedDurationMinutes: 110 },
      { chapterNumber: 5, chapterTitle: 'यह दंतुरहित मुस्कान', description: 'कविता', estimatedDurationMinutes: 100 },
      { chapterNumber: 6, chapterTitle: 'नेताजी का चश्मा', description: 'कहानी', estimatedDurationMinutes: 150 },
      { chapterNumber: 7, chapterTitle: 'बालगोबिन भगत', description: 'व्यक्ति चित्र', estimatedDurationMinutes: 140 },
      { chapterNumber: 8, chapterTitle: 'लखनवी अंदाज़', description: 'व्यंग्य', estimatedDurationMinutes: 130 },
    ],
    'Marathi': [
      { chapterNumber: 1, chapterTitle: 'उत्तम लक्षण', description: 'अभंग', estimatedDurationMinutes: 100 },
      { chapterNumber: 2, chapterTitle: 'बोलतो मराठी', description: 'कविता', estimatedDurationMinutes: 90 },
      { chapterNumber: 3, chapterTitle: 'आजी कालची गोष्ट', description: 'कथा', estimatedDurationMinutes: 140 },
      { chapterNumber: 4, chapterTitle: 'दिसला ग बाई दिसला', description: 'लोकगीत', estimatedDurationMinutes: 85 },
      { chapterNumber: 5, chapterTitle: 'वसंतराव देशपांडे', description: 'जीवनी', estimatedDurationMinutes: 150 },
      { chapterNumber: 6, chapterTitle: 'गवताचे पाते', description: 'कविता', estimatedDurationMinutes: 95 },
      { chapterNumber: 7, chapterTitle: 'फुलराणी', description: 'नाटक', estimatedDurationMinutes: 180 },
      { chapterNumber: 8, chapterTitle: 'माझ्या देशावर माझे प्रेम', description: 'निबंध', estimatedDurationMinutes: 120 },
    ],
    'Social Science': [
      { chapterNumber: 1, chapterTitle: 'The Rise of Nationalism in Europe', description: 'European nationalism', estimatedDurationMinutes: 180 },
      { chapterNumber: 2, chapterTitle: 'Nationalism in India', description: 'Indian freedom movement', estimatedDurationMinutes: 200 },
      { chapterNumber: 3, chapterTitle: 'The Making of a Global World', description: 'Globalization history', estimatedDurationMinutes: 170 },
      { chapterNumber: 4, chapterTitle: 'Resources and Development', description: 'Resource management', estimatedDurationMinutes: 160 },
      { chapterNumber: 5, chapterTitle: 'Forest and Wildlife Resources', description: 'Conservation', estimatedDurationMinutes: 150 },
      { chapterNumber: 6, chapterTitle: 'Water Resources', description: 'Water management', estimatedDurationMinutes: 160 },
      { chapterNumber: 7, chapterTitle: 'Power Sharing', description: 'Democratic power sharing', estimatedDurationMinutes: 140 },
      { chapterNumber: 8, chapterTitle: 'Federalism', description: 'Federal system in India', estimatedDurationMinutes: 160 },
      { chapterNumber: 9, chapterTitle: 'Democracy and Diversity', description: 'Social diversity', estimatedDurationMinutes: 150 },
      { chapterNumber: 10, chapterTitle: 'Development', description: 'Economic development', estimatedDurationMinutes: 140 },
    ],
  },
  
  // CLASS 11
  '11': {
    'Mathematics': [
      { chapterNumber: 1, chapterTitle: 'Sets', description: 'Set theory and operations', estimatedDurationMinutes: 180, learningObjectives: 'Understand sets and set operations' },
      { chapterNumber: 2, chapterTitle: 'Relations and Functions', description: 'Types of relations and functions', estimatedDurationMinutes: 200, learningObjectives: 'Work with relations and functions' },
      { chapterNumber: 3, chapterTitle: 'Trigonometric Functions', description: 'Trigonometric identities', estimatedDurationMinutes: 220, learningObjectives: 'Apply trigonometric identities' },
      { chapterNumber: 4, chapterTitle: 'Principle of Mathematical Induction', description: 'Proof by induction', estimatedDurationMinutes: 160, learningObjectives: 'Prove statements using induction' },
      { chapterNumber: 5, chapterTitle: 'Complex Numbers and Quadratic Equations', description: 'Complex number operations', estimatedDurationMinutes: 200, learningObjectives: 'Work with complex numbers' },
      { chapterNumber: 6, chapterTitle: 'Linear Inequalities', description: 'Solving inequalities', estimatedDurationMinutes: 170, learningObjectives: 'Solve and graph inequalities' },
      { chapterNumber: 7, chapterTitle: 'Permutations and Combinations', description: 'Counting principles', estimatedDurationMinutes: 200, learningObjectives: 'Apply counting principles' },
      { chapterNumber: 8, chapterTitle: 'Binomial Theorem', description: 'Binomial expansion', estimatedDurationMinutes: 180, learningObjectives: 'Apply binomial theorem' },
      { chapterNumber: 9, chapterTitle: 'Sequences and Series', description: 'AP, GP, and special series', estimatedDurationMinutes: 200, learningObjectives: 'Work with sequences and series' },
      { chapterNumber: 10, chapterTitle: 'Straight Lines', description: 'Equations of lines', estimatedDurationMinutes: 190, learningObjectives: 'Work with straight line equations' },
      { chapterNumber: 11, chapterTitle: 'Conic Sections', description: 'Parabola, ellipse, hyperbola', estimatedDurationMinutes: 240, learningObjectives: 'Understand conic sections' },
      { chapterNumber: 12, chapterTitle: 'Introduction to Three Dimensional Geometry', description: '3D coordinate system', estimatedDurationMinutes: 180, learningObjectives: 'Work with 3D coordinates' },
      { chapterNumber: 13, chapterTitle: 'Limits and Derivatives', description: 'Introduction to calculus', estimatedDurationMinutes: 220, learningObjectives: 'Calculate limits and derivatives' },
      { chapterNumber: 14, chapterTitle: 'Mathematical Reasoning', description: 'Logic and reasoning', estimatedDurationMinutes: 160, learningObjectives: 'Apply mathematical logic' },
      { chapterNumber: 15, chapterTitle: 'Statistics', description: 'Measures of dispersion', estimatedDurationMinutes: 180, learningObjectives: 'Calculate variance and standard deviation' },
      { chapterNumber: 16, chapterTitle: 'Probability', description: 'Probability theory', estimatedDurationMinutes: 200, learningObjectives: 'Solve probability problems' },
    ],
    'Physics': [
      { chapterNumber: 1, chapterTitle: 'Physical World', description: 'Nature of physics', estimatedDurationMinutes: 120 },
      { chapterNumber: 2, chapterTitle: 'Units and Measurements', description: 'SI units and errors', estimatedDurationMinutes: 180 },
      { chapterNumber: 3, chapterTitle: 'Motion in a Straight Line', description: 'Kinematics', estimatedDurationMinutes: 200 },
      { chapterNumber: 4, chapterTitle: 'Motion in a Plane', description: 'Vectors and projectile motion', estimatedDurationMinutes: 220 },
      { chapterNumber: 5, chapterTitle: 'Laws of Motion', description: 'Newton\'s laws', estimatedDurationMinutes: 240 },
      { chapterNumber: 6, chapterTitle: 'Work, Energy and Power', description: 'Energy concepts', estimatedDurationMinutes: 220 },
      { chapterNumber: 7, chapterTitle: 'System of Particles and Rotational Motion', description: 'Rotation mechanics', estimatedDurationMinutes: 260 },
      { chapterNumber: 8, chapterTitle: 'Gravitation', description: 'Gravitational laws', estimatedDurationMinutes: 220 },
      { chapterNumber: 9, chapterTitle: 'Mechanical Properties of Solids', description: 'Stress and strain', estimatedDurationMinutes: 180 },
      { chapterNumber: 10, chapterTitle: 'Mechanical Properties of Fluids', description: 'Fluid mechanics', estimatedDurationMinutes: 200 },
      { chapterNumber: 11, chapterTitle: 'Thermal Properties of Matter', description: 'Heat and temperature', estimatedDurationMinutes: 200 },
      { chapterNumber: 12, chapterTitle: 'Thermodynamics', description: 'Laws of thermodynamics', estimatedDurationMinutes: 220 },
      { chapterNumber: 13, chapterTitle: 'Kinetic Theory', description: 'Kinetic theory of gases', estimatedDurationMinutes: 180 },
      { chapterNumber: 14, chapterTitle: 'Oscillations', description: 'Simple harmonic motion', estimatedDurationMinutes: 200 },
      { chapterNumber: 15, chapterTitle: 'Waves', description: 'Wave motion', estimatedDurationMinutes: 220 },
    ],
    'Chemistry': [
      { chapterNumber: 1, chapterTitle: 'Some Basic Concepts of Chemistry', description: 'Mole concept, stoichiometry', estimatedDurationMinutes: 200 },
      { chapterNumber: 2, chapterTitle: 'Structure of Atom', description: 'Atomic models and quantum numbers', estimatedDurationMinutes: 240 },
      { chapterNumber: 3, chapterTitle: 'Classification of Elements', description: 'Periodic table', estimatedDurationMinutes: 200 },
      { chapterNumber: 4, chapterTitle: 'Chemical Bonding and Molecular Structure', description: 'Types of bonding', estimatedDurationMinutes: 260 },
      { chapterNumber: 5, chapterTitle: 'States of Matter', description: 'Gas laws and liquids', estimatedDurationMinutes: 200 },
      { chapterNumber: 6, chapterTitle: 'Thermodynamics', description: 'Enthalpy and entropy', estimatedDurationMinutes: 240 },
      { chapterNumber: 7, chapterTitle: 'Equilibrium', description: 'Chemical equilibrium', estimatedDurationMinutes: 260 },
      { chapterNumber: 8, chapterTitle: 'Redox Reactions', description: 'Oxidation-reduction', estimatedDurationMinutes: 180 },
      { chapterNumber: 9, chapterTitle: 'Hydrogen', description: 'Properties and compounds', estimatedDurationMinutes: 160 },
      { chapterNumber: 10, chapterTitle: 's-Block Elements', description: 'Alkali and alkaline metals', estimatedDurationMinutes: 200 },
      { chapterNumber: 11, chapterTitle: 'p-Block Elements', description: 'Groups 13 and 14', estimatedDurationMinutes: 220 },
      { chapterNumber: 12, chapterTitle: 'Organic Chemistry: Basic Principles', description: 'Introduction to organic chemistry', estimatedDurationMinutes: 240 },
      { chapterNumber: 13, chapterTitle: 'Hydrocarbons', description: 'Alkanes, alkenes, alkynes', estimatedDurationMinutes: 260 },
      { chapterNumber: 14, chapterTitle: 'Environmental Chemistry', description: 'Pollution and its effects', estimatedDurationMinutes: 160 },
    ],
    'Biology': [
      { chapterNumber: 1, chapterTitle: 'The Living World', description: 'Characteristics of life', estimatedDurationMinutes: 160 },
      { chapterNumber: 2, chapterTitle: 'Biological Classification', description: 'Five kingdom classification', estimatedDurationMinutes: 200 },
      { chapterNumber: 3, chapterTitle: 'Plant Kingdom', description: 'Plant classification', estimatedDurationMinutes: 220 },
      { chapterNumber: 4, chapterTitle: 'Animal Kingdom', description: 'Animal classification', estimatedDurationMinutes: 240 },
      { chapterNumber: 5, chapterTitle: 'Morphology of Flowering Plants', description: 'Plant morphology', estimatedDurationMinutes: 200 },
      { chapterNumber: 6, chapterTitle: 'Anatomy of Flowering Plants', description: 'Plant anatomy', estimatedDurationMinutes: 200 },
      { chapterNumber: 7, chapterTitle: 'Structural Organisation in Animals', description: 'Animal tissues', estimatedDurationMinutes: 180 },
      { chapterNumber: 8, chapterTitle: 'Cell: The Unit of Life', description: 'Cell structure', estimatedDurationMinutes: 220 },
      { chapterNumber: 9, chapterTitle: 'Biomolecules', description: 'Biological molecules', estimatedDurationMinutes: 200 },
      { chapterNumber: 10, chapterTitle: 'Cell Cycle and Cell Division', description: 'Mitosis and meiosis', estimatedDurationMinutes: 200 },
      { chapterNumber: 11, chapterTitle: 'Transport in Plants', description: 'Water and mineral transport', estimatedDurationMinutes: 180 },
      { chapterNumber: 12, chapterTitle: 'Mineral Nutrition', description: 'Plant nutrition', estimatedDurationMinutes: 160 },
      { chapterNumber: 13, chapterTitle: 'Photosynthesis in Higher Plants', description: 'Photosynthesis process', estimatedDurationMinutes: 220 },
      { chapterNumber: 14, chapterTitle: 'Respiration in Plants', description: 'Plant respiration', estimatedDurationMinutes: 180 },
      { chapterNumber: 15, chapterTitle: 'Plant Growth and Development', description: 'Plant hormones', estimatedDurationMinutes: 180 },
      { chapterNumber: 16, chapterTitle: 'Digestion and Absorption', description: 'Digestive system', estimatedDurationMinutes: 220 },
      { chapterNumber: 17, chapterTitle: 'Breathing and Exchange of Gases', description: 'Respiratory system', estimatedDurationMinutes: 200 },
      { chapterNumber: 18, chapterTitle: 'Body Fluids and Circulation', description: 'Circulatory system', estimatedDurationMinutes: 220 },
      { chapterNumber: 19, chapterTitle: 'Excretory Products and Elimination', description: 'Excretory system', estimatedDurationMinutes: 200 },
      { chapterNumber: 20, chapterTitle: 'Locomotion and Movement', description: 'Muscular and skeletal system', estimatedDurationMinutes: 180 },
      { chapterNumber: 21, chapterTitle: 'Neural Control and Coordination', description: 'Nervous system', estimatedDurationMinutes: 240 },
      { chapterNumber: 22, chapterTitle: 'Chemical Coordination and Integration', description: 'Endocrine system', estimatedDurationMinutes: 200 },
    ],
    'English': [
      { chapterNumber: 1, chapterTitle: 'The Portrait of a Lady', description: 'Grandmother\'s story', estimatedDurationMinutes: 150 },
      { chapterNumber: 2, chapterTitle: 'We\'re Not Afraid to Die', description: 'Adventure story', estimatedDurationMinutes: 160 },
      { chapterNumber: 3, chapterTitle: 'Discovering Tut: The Saga Continues', description: 'Archaeological discovery', estimatedDurationMinutes: 150 },
      { chapterNumber: 4, chapterTitle: 'Landscape of the Soul', description: 'Art appreciation', estimatedDurationMinutes: 140 },
      { chapterNumber: 5, chapterTitle: 'The Ailing Planet', description: 'Environmental essay', estimatedDurationMinutes: 150 },
      { chapterNumber: 6, chapterTitle: 'The Browning Version', description: 'Play excerpt', estimatedDurationMinutes: 140 },
      { chapterNumber: 7, chapterTitle: 'The Adventure', description: 'Science fiction', estimatedDurationMinutes: 160 },
      { chapterNumber: 8, chapterTitle: 'Silk Road', description: 'Travel writing', estimatedDurationMinutes: 150 },
    ],
    'Computer Science': [
      { chapterNumber: 1, chapterTitle: 'Computer Fundamentals', description: 'Basic computer concepts', estimatedDurationMinutes: 180 },
      { chapterNumber: 2, chapterTitle: 'Introduction to Python', description: 'Python basics', estimatedDurationMinutes: 200 },
      { chapterNumber: 3, chapterTitle: 'Data Handling', description: 'Variables and data types', estimatedDurationMinutes: 180 },
      { chapterNumber: 4, chapterTitle: 'Conditional Statements', description: 'If-else statements', estimatedDurationMinutes: 160 },
      { chapterNumber: 5, chapterTitle: 'Looping Statements', description: 'For and while loops', estimatedDurationMinutes: 180 },
      { chapterNumber: 6, chapterTitle: 'Strings', description: 'String manipulation', estimatedDurationMinutes: 170 },
      { chapterNumber: 7, chapterTitle: 'Lists', description: 'List operations', estimatedDurationMinutes: 180 },
      { chapterNumber: 8, chapterTitle: 'Tuples and Dictionaries', description: 'Data structures', estimatedDurationMinutes: 180 },
      { chapterNumber: 9, chapterTitle: 'Functions', description: 'User-defined functions', estimatedDurationMinutes: 200 },
      { chapterNumber: 10, chapterTitle: 'File Handling', description: 'Reading and writing files', estimatedDurationMinutes: 180 },
    ],
  },
  
  // CLASS 12
  '12': {
    'Mathematics': [
      { chapterNumber: 1, chapterTitle: 'Relations and Functions', description: 'Types of relations and functions', estimatedDurationMinutes: 200 },
      { chapterNumber: 2, chapterTitle: 'Inverse Trigonometric Functions', description: 'Properties and applications', estimatedDurationMinutes: 180 },
      { chapterNumber: 3, chapterTitle: 'Matrices', description: 'Matrix operations', estimatedDurationMinutes: 220 },
      { chapterNumber: 4, chapterTitle: 'Determinants', description: 'Properties and applications', estimatedDurationMinutes: 220 },
      { chapterNumber: 5, chapterTitle: 'Continuity and Differentiability', description: 'Calculus concepts', estimatedDurationMinutes: 240 },
      { chapterNumber: 6, chapterTitle: 'Application of Derivatives', description: 'Rate of change, maxima/minima', estimatedDurationMinutes: 260 },
      { chapterNumber: 7, chapterTitle: 'Integrals', description: 'Integration methods', estimatedDurationMinutes: 280 },
      { chapterNumber: 8, chapterTitle: 'Application of Integrals', description: 'Area under curves', estimatedDurationMinutes: 200 },
      { chapterNumber: 9, chapterTitle: 'Differential Equations', description: 'Solving differential equations', estimatedDurationMinutes: 240 },
      { chapterNumber: 10, chapterTitle: 'Vector Algebra', description: 'Vector operations', estimatedDurationMinutes: 220 },
      { chapterNumber: 11, chapterTitle: 'Three Dimensional Geometry', description: 'Lines and planes in 3D', estimatedDurationMinutes: 240 },
      { chapterNumber: 12, chapterTitle: 'Linear Programming', description: 'Optimization problems', estimatedDurationMinutes: 180 },
      { chapterNumber: 13, chapterTitle: 'Probability', description: 'Bayes\' theorem, distributions', estimatedDurationMinutes: 220 },
    ],
    'Physics': [
      { chapterNumber: 1, chapterTitle: 'Electric Charges and Fields', description: 'Electrostatics', estimatedDurationMinutes: 220 },
      { chapterNumber: 2, chapterTitle: 'Electrostatic Potential and Capacitance', description: 'Potential and capacitors', estimatedDurationMinutes: 220 },
      { chapterNumber: 3, chapterTitle: 'Current Electricity', description: 'Electric circuits', estimatedDurationMinutes: 260 },
      { chapterNumber: 4, chapterTitle: 'Moving Charges and Magnetism', description: 'Magnetic effects', estimatedDurationMinutes: 240 },
      { chapterNumber: 5, chapterTitle: 'Magnetism and Matter', description: 'Magnetic materials', estimatedDurationMinutes: 180 },
      { chapterNumber: 6, chapterTitle: 'Electromagnetic Induction', description: 'Faraday\'s laws', estimatedDurationMinutes: 220 },
      { chapterNumber: 7, chapterTitle: 'Alternating Current', description: 'AC circuits', estimatedDurationMinutes: 220 },
      { chapterNumber: 8, chapterTitle: 'Electromagnetic Waves', description: 'EM spectrum', estimatedDurationMinutes: 180 },
      { chapterNumber: 9, chapterTitle: 'Ray Optics and Optical Instruments', description: 'Mirrors and lenses', estimatedDurationMinutes: 260 },
      { chapterNumber: 10, chapterTitle: 'Wave Optics', description: 'Interference and diffraction', estimatedDurationMinutes: 220 },
      { chapterNumber: 11, chapterTitle: 'Dual Nature of Radiation and Matter', description: 'Photoelectric effect', estimatedDurationMinutes: 200 },
      { chapterNumber: 12, chapterTitle: 'Atoms', description: 'Atomic models', estimatedDurationMinutes: 200 },
      { chapterNumber: 13, chapterTitle: 'Nuclei', description: 'Nuclear physics', estimatedDurationMinutes: 200 },
      { chapterNumber: 14, chapterTitle: 'Semiconductor Electronics', description: 'Diodes and transistors', estimatedDurationMinutes: 240 },
    ],
    'Chemistry': [
      { chapterNumber: 1, chapterTitle: 'The Solid State', description: 'Crystal structures', estimatedDurationMinutes: 200 },
      { chapterNumber: 2, chapterTitle: 'Solutions', description: 'Concentration and colligative properties', estimatedDurationMinutes: 220 },
      { chapterNumber: 3, chapterTitle: 'Electrochemistry', description: 'Electrochemical cells', estimatedDurationMinutes: 240 },
      { chapterNumber: 4, chapterTitle: 'Chemical Kinetics', description: 'Reaction rates', estimatedDurationMinutes: 220 },
      { chapterNumber: 5, chapterTitle: 'Surface Chemistry', description: 'Adsorption and catalysis', estimatedDurationMinutes: 180 },
      { chapterNumber: 6, chapterTitle: 'General Principles of Isolation of Elements', description: 'Metallurgy', estimatedDurationMinutes: 200 },
      { chapterNumber: 7, chapterTitle: 'The p-Block Elements', description: 'Groups 15-18', estimatedDurationMinutes: 260 },
      { chapterNumber: 8, chapterTitle: 'The d and f Block Elements', description: 'Transition elements', estimatedDurationMinutes: 220 },
      { chapterNumber: 9, chapterTitle: 'Coordination Compounds', description: 'Complex compounds', estimatedDurationMinutes: 220 },
      { chapterNumber: 10, chapterTitle: 'Haloalkanes and Haloarenes', description: 'Organic halides', estimatedDurationMinutes: 220 },
      { chapterNumber: 11, chapterTitle: 'Alcohols, Phenols and Ethers', description: 'Oxygen compounds', estimatedDurationMinutes: 240 },
      { chapterNumber: 12, chapterTitle: 'Aldehydes, Ketones and Carboxylic Acids', description: 'Carbonyl compounds', estimatedDurationMinutes: 260 },
      { chapterNumber: 13, chapterTitle: 'Amines', description: 'Nitrogen compounds', estimatedDurationMinutes: 200 },
      { chapterNumber: 14, chapterTitle: 'Biomolecules', description: 'Carbohydrates, proteins, nucleic acids', estimatedDurationMinutes: 220 },
      { chapterNumber: 15, chapterTitle: 'Polymers', description: 'Types of polymers', estimatedDurationMinutes: 180 },
      { chapterNumber: 16, chapterTitle: 'Chemistry in Everyday Life', description: 'Applications of chemistry', estimatedDurationMinutes: 160 },
    ],
    'Biology': [
      { chapterNumber: 1, chapterTitle: 'Reproduction in Organisms', description: 'Types of reproduction', estimatedDurationMinutes: 180 },
      { chapterNumber: 2, chapterTitle: 'Sexual Reproduction in Flowering Plants', description: 'Plant reproduction', estimatedDurationMinutes: 220 },
      { chapterNumber: 3, chapterTitle: 'Human Reproduction', description: 'Reproductive system', estimatedDurationMinutes: 240 },
      { chapterNumber: 4, chapterTitle: 'Reproductive Health', description: 'Family planning', estimatedDurationMinutes: 180 },
      { chapterNumber: 5, chapterTitle: 'Principles of Inheritance and Variation', description: 'Mendelian genetics', estimatedDurationMinutes: 260 },
      { chapterNumber: 6, chapterTitle: 'Molecular Basis of Inheritance', description: 'DNA and genes', estimatedDurationMinutes: 280 },
      { chapterNumber: 7, chapterTitle: 'Evolution', description: 'Origin and evolution', estimatedDurationMinutes: 220 },
      { chapterNumber: 8, chapterTitle: 'Human Health and Disease', description: 'Diseases and immunity', estimatedDurationMinutes: 220 },
      { chapterNumber: 9, chapterTitle: 'Strategies for Enhancement in Food Production', description: 'Agricultural biotechnology', estimatedDurationMinutes: 180 },
      { chapterNumber: 10, chapterTitle: 'Microbes in Human Welfare', description: 'Beneficial microbes', estimatedDurationMinutes: 180 },
      { chapterNumber: 11, chapterTitle: 'Biotechnology: Principles and Processes', description: 'Genetic engineering', estimatedDurationMinutes: 220 },
      { chapterNumber: 12, chapterTitle: 'Biotechnology and its Applications', description: 'GMOs and applications', estimatedDurationMinutes: 200 },
      { chapterNumber: 13, chapterTitle: 'Organisms and Populations', description: 'Ecology basics', estimatedDurationMinutes: 200 },
      { chapterNumber: 14, chapterTitle: 'Ecosystem', description: 'Ecosystem structure', estimatedDurationMinutes: 200 },
      { chapterNumber: 15, chapterTitle: 'Biodiversity and Conservation', description: 'Conservation biology', estimatedDurationMinutes: 180 },
      { chapterNumber: 16, chapterTitle: 'Environmental Issues', description: 'Pollution and solutions', estimatedDurationMinutes: 180 },
    ],
    'English': [
      { chapterNumber: 1, chapterTitle: 'The Last Lesson', description: 'Alphonse Daudet story', estimatedDurationMinutes: 150 },
      { chapterNumber: 2, chapterTitle: 'Lost Spring', description: 'Stories of stolen childhood', estimatedDurationMinutes: 160 },
      { chapterNumber: 3, chapterTitle: 'Deep Water', description: 'Overcoming fear', estimatedDurationMinutes: 150 },
      { chapterNumber: 4, chapterTitle: 'The Rattrap', description: 'Swedish story', estimatedDurationMinutes: 160 },
      { chapterNumber: 5, chapterTitle: 'Indigo', description: 'Gandhi\'s champaran movement', estimatedDurationMinutes: 170 },
      { chapterNumber: 6, chapterTitle: 'Poets and Pancakes', description: 'Film industry memoir', estimatedDurationMinutes: 160 },
      { chapterNumber: 7, chapterTitle: 'The Interview', description: 'Celebrity interviews', estimatedDurationMinutes: 150 },
      { chapterNumber: 8, chapterTitle: 'Going Places', description: 'Dreams and reality', estimatedDurationMinutes: 140 },
    ],
    'Computer Science': [
      { chapterNumber: 1, chapterTitle: 'Python Revision', description: 'Python fundamentals review', estimatedDurationMinutes: 160 },
      { chapterNumber: 2, chapterTitle: 'Functions', description: 'Advanced functions', estimatedDurationMinutes: 200 },
      { chapterNumber: 3, chapterTitle: 'File Handling', description: 'Text and binary files', estimatedDurationMinutes: 200 },
      { chapterNumber: 4, chapterTitle: 'Data Structures', description: 'Stack and queue', estimatedDurationMinutes: 220 },
      { chapterNumber: 5, chapterTitle: 'Computer Networks', description: 'Network basics', estimatedDurationMinutes: 200 },
      { chapterNumber: 6, chapterTitle: 'Database Concepts', description: 'RDBMS basics', estimatedDurationMinutes: 180 },
      { chapterNumber: 7, chapterTitle: 'SQL', description: 'SQL queries', estimatedDurationMinutes: 240 },
      { chapterNumber: 8, chapterTitle: 'Interface Python with SQL', description: 'Database connectivity', estimatedDurationMinutes: 200 },
      { chapterNumber: 9, chapterTitle: 'Cyber Security', description: 'Security concepts', estimatedDurationMinutes: 160 },
      { chapterNumber: 10, chapterTitle: 'Society, Law and Ethics', description: 'IT ethics', estimatedDurationMinutes: 140 },
    ],
  },
};

// ==================== DETAILED TOPICS FOR KEY CHAPTERS ====================

const TOPICS_DATA: Record<string, Record<string, Record<number, TopicData[]>>> = {
  '8': {
    'Mathematics': {
      1: [ // Rational Numbers
        { topicTitle: 'Introduction to Rational Numbers', content: 'A rational number is a number that can be expressed as p/q where p and q are integers and q ≠ 0.', keyConcepts: 'Rational numbers, numerator, denominator, integers', estimatedDurationMinutes: 30, difficultyLevel: 1, aiTeachingPrompt: 'Explain rational numbers with simple examples' },
        { topicTitle: 'Properties of Rational Numbers', content: 'Rational numbers follow closure, commutative, associative, and distributive properties.', keyConcepts: 'Closure, commutative, associative, distributive properties', estimatedDurationMinutes: 45, difficultyLevel: 2, aiTeachingPrompt: 'Explain each property with examples' },
        { topicTitle: 'Representation on Number Line', content: 'Rational numbers can be represented on a number line between integers.', keyConcepts: 'Number line, positive rationals, negative rationals', estimatedDurationMinutes: 25, difficultyLevel: 1, aiTeachingPrompt: 'Show how to plot fractions on number line' },
        { topicTitle: 'Operations on Rational Numbers', content: 'Addition, subtraction, multiplication and division of rational numbers.', keyConcepts: 'Addition, subtraction, multiplication, division, LCM', estimatedDurationMinutes: 50, difficultyLevel: 2, aiTeachingPrompt: 'Demonstrate operations with step-by-step examples' },
        { topicTitle: 'Finding Rational Numbers Between Two Numbers', content: 'Infinite rational numbers exist between any two rational numbers.', keyConcepts: 'Dense property, mean method', estimatedDurationMinutes: 25, difficultyLevel: 2, aiTeachingPrompt: 'Show methods to find rationals between two numbers' },
      ],
      6: [ // Squares and Square Roots
        { topicTitle: 'Perfect Squares', content: 'A perfect square is a number that is the square of an integer.', keyConcepts: 'Perfect squares, square numbers', estimatedDurationMinutes: 25, difficultyLevel: 1, aiTeachingPrompt: 'List perfect squares and identify patterns' },
        { topicTitle: 'Properties of Square Numbers', content: 'Square numbers have specific properties and patterns.', keyConcepts: 'Ending digits, sum of odd numbers', estimatedDurationMinutes: 35, difficultyLevel: 2, aiTeachingPrompt: 'Explain properties with examples' },
        { topicTitle: 'Finding Square Roots', content: 'Methods to find square roots including prime factorization and long division.', keyConcepts: 'Prime factorization, long division method', estimatedDurationMinutes: 45, difficultyLevel: 2, aiTeachingPrompt: 'Demonstrate both methods step by step' },
        { topicTitle: 'Square Roots of Decimals', content: 'Finding square roots of decimal numbers.', keyConcepts: 'Decimal square roots, placement of decimal', estimatedDurationMinutes: 30, difficultyLevel: 3, aiTeachingPrompt: 'Show decimal square root calculation' },
        { topicTitle: 'Estimating Square Roots', content: 'Estimating square roots of non-perfect squares.', keyConcepts: 'Estimation, approximation', estimatedDurationMinutes: 25, difficultyLevel: 2, aiTeachingPrompt: 'Teach estimation techniques' },
      ],
    },
    'Science': {
      8: [ // Cell Structure and Functions
        { topicTitle: 'Discovery of Cell', content: 'Robert Hooke discovered cells in 1665 while observing cork.', keyConcepts: 'Cell theory, Robert Hooke, microscope', estimatedDurationMinutes: 25, difficultyLevel: 1, aiTeachingPrompt: 'Tell the story of cell discovery' },
        { topicTitle: 'Cell - Basic Unit of Life', content: 'The cell is the structural and functional unit of all living organisms.', keyConcepts: 'Unicellular, multicellular, cell theory', estimatedDurationMinutes: 30, difficultyLevel: 1, aiTeachingPrompt: 'Explain why cells are building blocks of life' },
        { topicTitle: 'Cell Membrane and Cell Wall', content: 'Cell membrane controls entry and exit. Plant cells have additional cell wall.', keyConcepts: 'Plasma membrane, cell wall, semi-permeable', estimatedDurationMinutes: 35, difficultyLevel: 2, aiTeachingPrompt: 'Compare cell membrane and cell wall' },
        { topicTitle: 'Nucleus and Cytoplasm', content: 'Nucleus controls cell activities. Cytoplasm contains organelles.', keyConcepts: 'Nucleus, nucleolus, cytoplasm, organelles', estimatedDurationMinutes: 40, difficultyLevel: 2, aiTeachingPrompt: 'Explain nucleus as control center' },
        { topicTitle: 'Cell Organelles', content: 'Different organelles perform specific functions in the cell.', keyConcepts: 'Mitochondria, chloroplast, ER, Golgi, ribosomes', estimatedDurationMinutes: 50, difficultyLevel: 2, aiTeachingPrompt: 'Describe each organelle with analogies' },
        { topicTitle: 'Plant Cell vs Animal Cell', content: 'Differences between plant and animal cells.', keyConcepts: 'Cell wall, chloroplast, vacuole, centrioles', estimatedDurationMinutes: 35, difficultyLevel: 2, aiTeachingPrompt: 'Use comparison table for differences' },
      ],
    },
  },
  '10': {
    'Mathematics': {
      1: [ // Real Numbers
        { topicTitle: 'Euclid\'s Division Lemma', content: 'For positive integers a and b, there exist unique integers q and r such that a = bq + r.', keyConcepts: 'Division algorithm, quotient, remainder', estimatedDurationMinutes: 35, difficultyLevel: 2, aiTeachingPrompt: 'Explain lemma with division examples' },
        { topicTitle: 'Euclid\'s Division Algorithm', content: 'Method to find HCF of two positive integers using Euclid\'s division lemma.', keyConcepts: 'HCF, algorithm steps, successive division', estimatedDurationMinutes: 40, difficultyLevel: 2, aiTeachingPrompt: 'Demonstrate HCF calculation step by step' },
        { topicTitle: 'Fundamental Theorem of Arithmetic', content: 'Every composite number can be expressed as product of primes uniquely.', keyConcepts: 'Prime factorization, unique factorization', estimatedDurationMinutes: 35, difficultyLevel: 2, aiTeachingPrompt: 'Show prime factorization examples' },
        { topicTitle: 'HCF and LCM Using Prime Factorization', content: 'Finding HCF and LCM using prime factors.', keyConcepts: 'HCF, LCM, prime factors, relationship', estimatedDurationMinutes: 40, difficultyLevel: 2, aiTeachingPrompt: 'Calculate HCF and LCM with examples' },
        { topicTitle: 'Irrational Numbers', content: 'Numbers that cannot be expressed as p/q are irrational.', keyConcepts: 'Irrational numbers, √2, π, proof by contradiction', estimatedDurationMinutes: 45, difficultyLevel: 3, aiTeachingPrompt: 'Prove √2 is irrational' },
        { topicTitle: 'Decimal Expansions', content: 'Rational numbers have terminating or repeating decimals.', keyConcepts: 'Terminating decimal, non-terminating repeating', estimatedDurationMinutes: 35, difficultyLevel: 2, aiTeachingPrompt: 'Show decimal expansion patterns' },
      ],
      8: [ // Introduction to Trigonometry
        { topicTitle: 'Trigonometric Ratios', content: 'Ratios of sides of a right triangle - sin, cos, tan.', keyConcepts: 'Sine, cosine, tangent, opposite, adjacent, hypotenuse', estimatedDurationMinutes: 45, difficultyLevel: 2, aiTeachingPrompt: 'Define ratios using right triangle' },
        { topicTitle: 'Trigonometric Ratios of Specific Angles', content: 'Values of trigonometric ratios at 0°, 30°, 45°, 60°, 90°.', keyConcepts: 'Standard angles, trigonometric table', estimatedDurationMinutes: 40, difficultyLevel: 2, aiTeachingPrompt: 'Derive values for standard angles' },
        { topicTitle: 'Complementary Angles', content: 'Trigonometric ratios of complementary angles.', keyConcepts: 'Complementary angles, sin(90-θ) = cosθ', estimatedDurationMinutes: 30, difficultyLevel: 2, aiTeachingPrompt: 'Show relationships between complementary angles' },
        { topicTitle: 'Trigonometric Identities', content: 'sin²θ + cos²θ = 1 and related identities.', keyConcepts: 'Pythagorean identity, sec²θ - tan²θ = 1', estimatedDurationMinutes: 45, difficultyLevel: 3, aiTeachingPrompt: 'Prove and apply trigonometric identities' },
      ],
    },
    'Science': {
      1: [ // Chemical Reactions and Equations
        { topicTitle: 'Chemical Reactions', content: 'A chemical reaction involves breaking and making of bonds.', keyConcepts: 'Reactants, products, chemical change', estimatedDurationMinutes: 30, difficultyLevel: 1, aiTeachingPrompt: 'Give everyday examples of chemical reactions' },
        { topicTitle: 'Writing Chemical Equations', content: 'Representing reactions using symbols and formulae.', keyConcepts: 'Word equation, chemical equation, symbols', estimatedDurationMinutes: 35, difficultyLevel: 2, aiTeachingPrompt: 'Convert word equations to chemical equations' },
        { topicTitle: 'Balancing Chemical Equations', content: 'Making number of atoms equal on both sides.', keyConcepts: 'Law of conservation of mass, balancing', estimatedDurationMinutes: 45, difficultyLevel: 2, aiTeachingPrompt: 'Show step-by-step balancing' },
        { topicTitle: 'Types of Chemical Reactions', content: 'Combination, decomposition, displacement, double displacement, redox.', keyConcepts: 'Reaction types, identification', estimatedDurationMinutes: 50, difficultyLevel: 2, aiTeachingPrompt: 'Give examples of each type' },
        { topicTitle: 'Oxidation and Reduction', content: 'Gain and loss of oxygen/hydrogen, electron transfer.', keyConcepts: 'Oxidation, reduction, redox, corrosion', estimatedDurationMinutes: 40, difficultyLevel: 3, aiTeachingPrompt: 'Explain redox with examples' },
      ],
    },
  },
};

// ==================== CONTENT BLOCKS ====================

const CONTENT_BLOCKS_DATA: Record<string, ContentBlockData[]> = {
  'Introduction to Rational Numbers': [
    { blockType: BlockType.HEADING, content: 'What are Rational Numbers?', sequenceOrder: 1 },
    { blockType: BlockType.TEXT, content: 'A rational number is any number that can be expressed as a fraction p/q, where p and q are integers and q is not equal to zero. The word "rational" comes from the word "ratio".', aiExplanation: 'Think of it like sharing a pizza - if you have 3 slices out of 4, you have 3/4 of the pizza!', sequenceOrder: 2 },
    { blockType: BlockType.DEFINITION, content: 'Rational Number: A number that can be written in the form p/q where p and q are integers and q ≠ 0.', sequenceOrder: 3 },
    { blockType: BlockType.EXAMPLE, content: 'Examples of Rational Numbers:\n• 1/2 (one-half)\n• -3/4 (negative three-fourths)\n• 5 (can be written as 5/1)\n• 0 (can be written as 0/1)\n• -7 (can be written as -7/1)', sequenceOrder: 4 },
    { blockType: BlockType.NOTE, content: 'All integers, fractions, and terminating/repeating decimals are rational numbers.', sequenceOrder: 5 },
    { blockType: BlockType.TIP, content: 'To check if a number is rational, try to express it as a fraction. If you can, it is rational!', sequenceOrder: 6 },
  ],
  'Discovery of Cell': [
    { blockType: BlockType.HEADING, content: 'The Discovery of Cells', sequenceOrder: 1 },
    { blockType: BlockType.TEXT, content: 'In 1665, English scientist Robert Hooke was examining a thin slice of cork under a simple microscope. He observed tiny box-like compartments that reminded him of the small rooms monks lived in, called "cells".', aiExplanation: 'Imagine looking through a magnifying glass at a honeycomb - you would see many small compartments. That is similar to what Hooke saw!', sequenceOrder: 2 },
    { blockType: BlockType.NOTE, content: 'The cells Hooke observed were actually dead cell walls of cork. Living cells were first observed by Anton van Leeuwenhoek.', sequenceOrder: 3 },
    { blockType: BlockType.DEFINITION, content: 'Cell: The basic structural and functional unit of all living organisms. It is often called the "building block of life".', sequenceOrder: 4 },
    { blockType: BlockType.TEXT, content: 'Cell Theory states:\n1. All living things are made of one or more cells\n2. The cell is the basic unit of life\n3. All cells arise from pre-existing cells', sequenceOrder: 5 },
  ],
  'Euclid\'s Division Lemma': [
    { blockType: BlockType.HEADING, content: 'Understanding Euclid\'s Division Lemma', sequenceOrder: 1 },
    { blockType: BlockType.TEXT, content: 'Euclid\'s Division Lemma is a fundamental concept that states: For any two positive integers a and b, there exist unique integers q (quotient) and r (remainder) such that a = bq + r, where 0 ≤ r < b.', aiExplanation: 'It is like dividing chocolates among friends - you get a quotient (how many each gets) and remainder (what is left over)!', sequenceOrder: 2 },
    { blockType: BlockType.FORMULA, content: 'a = bq + r, where 0 ≤ r < b', sequenceOrder: 3 },
    { blockType: BlockType.EXAMPLE, content: 'Example: Divide 17 by 5\n17 = 5 × 3 + 2\nHere, a = 17, b = 5, q = 3, r = 2\nCheck: 0 ≤ 2 < 5 ✓', sequenceOrder: 4 },
    { blockType: BlockType.TIP, content: 'Remember: The remainder is always less than the divisor (b) and greater than or equal to 0.', sequenceOrder: 5 },
  ],
};

// ==================== QUIZ DATA ====================

const QUIZ_DATA: Record<string, { quizTitle: string; questions: QuestionData[] }> = {
  'Introduction to Rational Numbers': {
    quizTitle: 'Rational Numbers Quiz',
    questions: [
      { questionType: QuestionType.MCQ, questionText: 'Which of the following is a rational number?', options: ['√2', '√3', '3/4', 'π'], correctAnswer: '3/4', explanation: '3/4 can be expressed as p/q. √2, √3, and π are irrational.', marks: 1, sequenceOrder: 1, difficultyLevel: 'easy' },
      { questionType: QuestionType.MCQ, questionText: 'What is the denominator in 5/7?', options: ['5', '7', '12', '35'], correctAnswer: '7', explanation: 'In p/q, q is the denominator. Here q = 7.', marks: 1, sequenceOrder: 2, difficultyLevel: 'easy' },
      { questionType: QuestionType.TRUE_FALSE, questionText: 'Every integer is a rational number.', options: ['True', 'False'], correctAnswer: 'True', explanation: 'Every integer n can be written as n/1.', marks: 1, sequenceOrder: 3, difficultyLevel: 'easy' },
      { questionType: QuestionType.MCQ, questionText: 'Which cannot be expressed as a rational number?', options: ['0.5', '0.333...', '√5', '-3'], correctAnswer: '√5', explanation: '√5 is irrational as it cannot be expressed as p/q.', marks: 1, sequenceOrder: 4, difficultyLevel: 'medium' },
      { questionType: QuestionType.MCQ, questionText: 'The rational number 0 can be written as:', options: ['0/0', '0/1', '1/0', 'None'], correctAnswer: '0/1', explanation: '0 = 0/1. 0/0 is undefined and 1/0 is not defined.', marks: 1, sequenceOrder: 5, difficultyLevel: 'easy' },
    ],
  },
  'Discovery of Cell': {
    quizTitle: 'Cell Discovery Quiz',
    questions: [
      { questionType: QuestionType.MCQ, questionText: 'Who discovered cells?', options: ['Robert Hooke', 'Isaac Newton', 'Charles Darwin', 'Gregor Mendel'], correctAnswer: 'Robert Hooke', explanation: 'Robert Hooke discovered cells in 1665.', marks: 1, sequenceOrder: 1, difficultyLevel: 'easy' },
      { questionType: QuestionType.MCQ, questionText: 'In which year were cells discovered?', options: ['1655', '1665', '1675', '1685'], correctAnswer: '1665', explanation: 'Cells were discovered in 1665.', marks: 1, sequenceOrder: 2, difficultyLevel: 'easy' },
      { questionType: QuestionType.MCQ, questionText: 'What material did Hooke observe?', options: ['Leaf', 'Cork', 'Blood', 'Skin'], correctAnswer: 'Cork', explanation: 'Hooke observed a thin slice of cork.', marks: 1, sequenceOrder: 3, difficultyLevel: 'easy' },
      { questionType: QuestionType.TRUE_FALSE, questionText: 'Cells are called building blocks of life.', options: ['True', 'False'], correctAnswer: 'True', explanation: 'Cells are indeed building blocks of life.', marks: 1, sequenceOrder: 4, difficultyLevel: 'easy' },
      { questionType: QuestionType.MCQ, questionText: 'All cells arise from:', options: ['Water', 'Air', 'Pre-existing cells', 'Sunlight'], correctAnswer: 'Pre-existing cells', explanation: 'Cell theory states cells come from pre-existing cells.', marks: 1, sequenceOrder: 5, difficultyLevel: 'medium' },
    ],
  },
  'Euclid\'s Division Lemma': {
    quizTitle: 'Real Numbers - Euclid\'s Division Quiz',
    questions: [
      { questionType: QuestionType.MCQ, questionText: 'In Euclid\'s division lemma a = bq + r, what is the condition for r?', options: ['r > b', 'r = b', '0 ≤ r < b', 'r < 0'], correctAnswer: '0 ≤ r < b', explanation: 'The remainder must be non-negative and less than divisor.', marks: 1, sequenceOrder: 1, difficultyLevel: 'easy' },
      { questionType: QuestionType.MCQ, questionText: 'When 23 is divided by 5, the remainder is:', options: ['3', '4', '5', '2'], correctAnswer: '3', explanation: '23 = 5 × 4 + 3, so remainder is 3.', marks: 1, sequenceOrder: 2, difficultyLevel: 'easy' },
      { questionType: QuestionType.MCQ, questionText: 'HCF of 12 and 18 using Euclid\'s algorithm is:', options: ['2', '3', '6', '9'], correctAnswer: '6', explanation: '18 = 12 × 1 + 6, 12 = 6 × 2 + 0. HCF = 6.', marks: 1, sequenceOrder: 3, difficultyLevel: 'medium' },
      { questionType: QuestionType.TRUE_FALSE, questionText: 'Euclid\'s division lemma can find HCF of two numbers.', options: ['True', 'False'], correctAnswer: 'True', explanation: 'Euclid\'s algorithm uses the lemma to find HCF.', marks: 1, sequenceOrder: 4, difficultyLevel: 'easy' },
      { questionType: QuestionType.MCQ, questionText: 'If a = 45, b = 6, find q and r:', options: ['q=7, r=3', 'q=7, r=2', 'q=8, r=3', 'q=6, r=9'], correctAnswer: 'q=7, r=3', explanation: '45 = 6 × 7 + 3. So q=7, r=3.', marks: 1, sequenceOrder: 5, difficultyLevel: 'medium' },
    ],
  },
};

// ==================== MAIN SEEDING FUNCTION ====================

async function seedCompleteAcademicContent() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    logger.info('📚 Starting COMPLETE academic content seeding...');

    const boardRepo = AppDataSource.getRepository(Board);
    const classRepo = AppDataSource.getRepository(Class);
    const subjectRepo = AppDataSource.getRepository(Subject);
    const bookRepo = AppDataSource.getRepository(Book);
    const chapterRepo = AppDataSource.getRepository(Chapter);
    const topicRepo = AppDataSource.getRepository(Topic);
    const contentBlockRepo = AppDataSource.getRepository(ContentBlock);
    const quizRepo = AppDataSource.getRepository(Quiz);
    const questionRepo = AppDataSource.getRepository(Question);

    // Find Maharashtra Board
    const mhBoard = await boardRepo.findOne({ where: { name: 'STATE_MH' } });
    if (!mhBoard) {
      logger.error('❌ Maharashtra Board not found. Run main seed first: npm run seed');
      process.exit(1);
    }
    logger.info(`✅ Found Maharashtra Board: ${mhBoard.fullName}`);

    let totalSubjects = 0;
    let totalChapters = 0;
    let totalTopics = 0;
    let totalContentBlocks = 0;
    let totalQuizzes = 0;
    let totalQuestions = 0;

    // Process each class (6-12)
    for (const className of ['6', '7', '8', '9', '10', '11', '12']) {
      logger.info(`\n📖 Processing Class ${className}...`);

      // Find the class
      const classEntity = await classRepo.findOne({
        where: { boardId: mhBoard.id, className }
      });

      if (!classEntity) {
        logger.warn(`⚠️ Class ${className} not found, skipping...`);
        continue;
      }

      // Get subjects for this class
      const subjectsData = SUBJECTS_BY_CLASS[className] || [];

      // Create subjects
      for (let i = 0; i < subjectsData.length; i++) {
        const subjectData = subjectsData[i];

        let subject = await subjectRepo.findOne({
          where: { classId: classEntity.id, subjectName: subjectData.subjectName, medium: Medium.ENGLISH }
        });

        if (!subject) {
          subject = subjectRepo.create({
            classId: classEntity.id,
            medium: Medium.ENGLISH,
            displayOrder: i + 1,
            ...subjectData,
          });
          await subjectRepo.save(subject);
          totalSubjects++;
        }

        // Create book for subject
        const bookTitle = `${subjectData.subjectName} Class ${className}`;
        let book = await bookRepo.findOne({
          where: { subjectId: subject.id, bookTitle }
        });

        if (!book) {
          book = bookRepo.create({
            subjectId: subject.id,
            bookTitle,
            publisher: 'Maharashtra State Board',
            edition: '2024',
            publicationYear: 2024,
            description: `Official Maharashtra State Board ${subjectData.subjectName} textbook for Class ${className}`,
            displayOrder: 1,
          });
          await bookRepo.save(book);
        }

        // Create chapters
        const chaptersData = CHAPTERS_DATA[className]?.[subjectData.subjectName] || [];

        for (const chapterData of chaptersData) {
          let chapter = await chapterRepo.findOne({
            where: { bookId: book.id, chapterNumber: chapterData.chapterNumber }
          });

          if (!chapter) {
            chapter = chapterRepo.create({
              bookId: book.id,
              displayOrder: chapterData.chapterNumber,
              ...chapterData,
            });
            await chapterRepo.save(chapter);
            totalChapters++;
          }

          // Check if we have detailed topics for this chapter
          const topicsData = TOPICS_DATA[className]?.[subjectData.subjectName]?.[chapterData.chapterNumber];

          if (topicsData) {
            for (let t = 0; t < topicsData.length; t++) {
              const topicData = topicsData[t];

              let topic = await topicRepo.findOne({
                where: { chapterId: chapter.id, topicTitle: topicData.topicTitle }
              });

              if (!topic) {
                topic = topicRepo.create({
                  chapterId: chapter.id,
                  displayOrder: t + 1,
                  ...topicData,
                });
                await topicRepo.save(topic);
                totalTopics++;
              }

              // Add content blocks if available
              const contentBlocks = CONTENT_BLOCKS_DATA[topicData.topicTitle];
              if (contentBlocks) {
                for (const blockData of contentBlocks) {
                  const existingBlock = await contentBlockRepo.findOne({
                    where: { topicId: topic.id, sequenceOrder: blockData.sequenceOrder }
                  });

                  if (!existingBlock) {
                    const block = contentBlockRepo.create({
                      topicId: topic.id,
                      ...blockData,
                    });
                    await contentBlockRepo.save(block);
                    totalContentBlocks++;
                  }
                }
              }

              // Add quiz if available
              const quizData = QUIZ_DATA[topicData.topicTitle];
              if (quizData) {
                let quiz = await quizRepo.findOne({
                  where: { topicId: topic.id, quizTitle: quizData.quizTitle }
                });

                if (!quiz) {
                  quiz = quizRepo.create({
                    topicId: topic.id,
                    quizTitle: quizData.quizTitle,
                    description: `Test your knowledge of ${topicData.topicTitle}`,
                    quizType: QuizType.TOPIC,
                    difficultyLevel: DifficultyLevel.EASY,
                    totalQuestions: quizData.questions.length,
                    totalMarks: quizData.questions.length,
                    timeLimitMinutes: 10,
                    passingPercentage: 60,
                    shuffleQuestions: true,
                    showAnswerAfterSubmit: true,
                  });
                  await quizRepo.save(quiz);
                  totalQuizzes++;
                }

                // Add questions
                for (const qData of quizData.questions) {
                  const existingQ = await questionRepo.findOne({
                    where: { quizId: quiz.id, sequenceOrder: qData.sequenceOrder }
                  });

                  if (!existingQ) {
                    const question = questionRepo.create({
                      quizId: quiz.id,
                      ...qData,
                    });
                    await questionRepo.save(question);
                    totalQuestions++;
                  }
                }
              }
            }
          } else {
            // Create basic topics for chapters without detailed data
            const basicTopics = [
              { topicTitle: `Introduction to ${chapterData.chapterTitle}`, estimatedDurationMinutes: 30, difficultyLevel: 1 },
              { topicTitle: `Key Concepts in ${chapterData.chapterTitle}`, estimatedDurationMinutes: 45, difficultyLevel: 2 },
              { topicTitle: `${chapterData.chapterTitle} - Practice Problems`, estimatedDurationMinutes: 40, difficultyLevel: 2 },
            ];

            for (let t = 0; t < basicTopics.length; t++) {
              const topicData = basicTopics[t];

              let topic = await topicRepo.findOne({
                where: { chapterId: chapter.id, topicTitle: topicData.topicTitle }
              });

              if (!topic) {
                topic = topicRepo.create({
                  chapterId: chapter.id,
                  topicTitle: topicData.topicTitle,
                  content: `Content for ${topicData.topicTitle}`,
                  keyConcepts: chapterData.chapterTitle,
                  estimatedDurationMinutes: topicData.estimatedDurationMinutes,
                  difficultyLevel: topicData.difficultyLevel,
                  aiTeachingPrompt: `Teach ${topicData.topicTitle} with examples`,
                  displayOrder: t + 1,
                });
                await topicRepo.save(topic);
                totalTopics++;
              }
            }
          }
        }
      }

      logger.info(`✅ Class ${className} completed`);
    }

    // Print summary
    logger.info('\n🎉 COMPLETE Academic Content Seeding Finished!');
    logger.info('═══════════════════════════════════════════════');
    logger.info(`📚 Subjects Created:       ${totalSubjects}`);
    logger.info(`📖 Chapters Created:       ${totalChapters}`);
    logger.info(`📝 Topics Created:         ${totalTopics}`);
    logger.info(`📄 Content Blocks Created: ${totalContentBlocks}`);
    logger.info(`❓ Quizzes Created:        ${totalQuizzes}`);
    logger.info(`✅ Questions Created:      ${totalQuestions}`);
    logger.info('═══════════════════════════════════════════════');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedCompleteAcademicContent();
