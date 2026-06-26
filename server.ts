import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Set high limit for base64 image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Server-side Gemini API Route
app.post('/api/analyze-complaint', async (req, res) => {
  try {
    const { title, description, images } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY environment variable is not configured. Please add it in Settings > Secrets.',
      });
    }

    // Lazy initialization of Gemini SDK
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Structure image parts for multimodal input
    const imageParts = (images || []).map((base64Str: string) => {
      let mimeType = 'image/jpeg';
      let data = base64Str;
      if (base64Str.startsWith('data:')) {
        const match = base64Str.match(/^data:([^;]+);base64,(.*)$/);
        if (match) {
          mimeType = match[1];
          data = match[2];
        }
      }
      return {
        inlineData: {
          mimeType,
          data,
        },
      };
    });

    const textPrompt = `You are an advanced AI civic assistant analyzing a citizen's complaint to route and classify it properly for city authorities.
Complaint Title: ${title || 'No Title'}
Complaint Description: ${description || 'No Description'}

Analyze the complaint text and any attached images. You MUST carefully inspect the images and text to detect if any of these specific issue categories are present:
- Road potholes
- Garbage
- Water leakage
- Broken street lights
- Electricity hazards
- Illegal dumping
- Fallen trees
- Traffic obstruction

Your response must be a highly detailed analysis containing:
1. Department to route the complaint to (e.g. 'Sanitation', 'Roads & Traffic', 'Water Supply', 'Public Safety', 'Health', 'Environment', 'Others').
2. Severity score on a scale of 1 to 5 (1 = lowest/minor inconvenience, 5 = critical/life-threatening or severe public hazard).
3. Priority class ('low', 'medium', 'high', 'critical') based on the severity and public safety impact.
4. Estimated resolution time (e.g., '24 hours', '3 days', '1 week') and a specific estimated repair time for the field crew.
5. Recommended action for municipal authorities to resolve this issue.
6. A confidence score between 0 and 100 representing how confident you are in your image/text classification.
7. Helpful citizen safety tips/precautions for people near this issue.
8. A fake complaint probability percentage between 0 and 100 indicating how likely this is a prank, spam, unrelated photo, or duplicate. Set 'isFake' to true if this probability is high (>= 50%).
9. A clear list of detected issues matching the specified categories above, or any other visible hazards.
10. AI Reasoning: Walk through your visual observations and logical steps of how you analyzed the image(s) and description. Be specific about what you see in the photos (e.g. cracked asphalt, leaking pipe, hazard tape, street light post).`;

    const parts = [
      ...imageParts,
      { text: textPrompt },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            department: {
              type: Type.STRING,
              description: "Department to route the complaint to. Must be one of: 'Sanitation', 'Roads & Traffic', 'Water Supply', 'Public Safety', 'Health', 'Environment', 'Others'.",
            },
            severity: {
              type: Type.INTEGER,
              description: 'Severity score from 1 (lowest) to 5 (highest/critical hazard).',
            },
            priority: {
              type: Type.STRING,
              description: "Priority of the complaint. Must be one of: 'low', 'medium', 'high', 'critical'.",
            },
            estimatedResolutionTime: {
              type: Type.STRING,
              description: "Estimated overall SLA resolution time (e.g., '48 hours', '3 days', '1 week').",
            },
            estimatedRepairTime: {
              type: Type.STRING,
              description: "Specific estimated active repair time required for field crews to fix the physical hazard (e.g., '4 hours', '2 days').",
            },
            suggestedAction: {
              type: Type.STRING,
              description: 'A concrete, helpful action suggestion for municipal authorities.',
            },
            recommendedAction: {
              type: Type.STRING,
              description: 'Specific recommendation and procedural steps for resolving this civic complaint.',
            },
            confidence: {
              type: Type.INTEGER,
              description: 'Confidence score of the AI analysis as a percentage from 0 to 100.',
            },
            citizenTips: {
              type: Type.STRING,
              description: 'Public safety tips, instructions, or precautions for citizens near the incident site.',
            },
            fakeComplaintProbability: {
              type: Type.INTEGER,
              description: 'Probability that this is a fake, spam, or prank complaint as a percentage from 0 to 100.',
            },
            isFake: {
              type: Type.BOOLEAN,
              description: 'Whether this report is highly likely to be a fake report, spam, or prank (typically when fakeComplaintProbability >= 50%).',
            },
            detectedIssues: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of detected issues matching one or more of: 'Road potholes', 'Garbage', 'Water leakage', 'Broken street lights', 'Electricity hazards', 'Illegal dumping', 'Fallen trees', 'Traffic obstruction'.",
            },
            aiReasoning: {
              type: Type.STRING,
              description: 'Detailed AI reasoning and step-by-step logic explaining the visual or textual analysis of the complaint.',
            },
          },
          required: [
            'department',
            'severity',
            'priority',
            'estimatedResolutionTime',
            'estimatedRepairTime',
            'suggestedAction',
            'recommendedAction',
            'confidence',
            'citizenTips',
            'fakeComplaintProbability',
            'isFake',
            'detectedIssues',
            'aiReasoning'
          ],
        },
      },
    });

    const resultText = response.text || '{}';
    const analysis = JSON.parse(resultText);

    return res.json(analysis);
  } catch (error: any) {
    console.error('Error analyzing complaint:', error);
    return res.status(500).json({
      error: error.message || 'Failed to analyze the complaint using AI.',
    });
  }
});

// Setup Vite Dev Server / Static Files
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

setupServer();
