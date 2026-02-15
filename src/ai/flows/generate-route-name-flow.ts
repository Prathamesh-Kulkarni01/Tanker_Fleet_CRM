'use server';
/**
 * @fileOverview A Genkit flow for generating a concise route name from source and destination addresses.
 *
 * - generateRouteName - A function that generates the route name.
 * - GenerateRouteNameInput - The input type for the generation.
 * - GenerateRouteNameOutput - The return type for the generation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateRouteNameInputSchema = z.object({
  source: z.string().describe('The starting point of the route.'),
  destinations: z.array(z.string()).describe('A list of destinations for the route.'),
});
export type GenerateRouteNameInput = z.infer<typeof GenerateRouteNameInputSchema>;

const GenerateRouteNameOutputSchema = z.object({
  routeName: z.string().describe('A short, memorable, and descriptive name for the route.'),
});
export type GenerateRouteNameOutput = z.infer<typeof GenerateRouteNameOutputSchema>;

export async function generateRouteName(
  input: GenerateRouteNameInput
): Promise<GenerateRouteNameOutput> {
  return generateRouteNameFlow(input);
}

const generateRouteNamePrompt = ai.definePrompt({
  name: 'generateRouteNamePrompt',
  input: { schema: GenerateRouteNameInputSchema },
  output: { schema: GenerateRouteNameOutputSchema },
  prompt: `You are an expert at creating concise and descriptive names for delivery routes.
Given a source and a list of destinations, generate a short, memorable name for the route.

For example:
- Source: "Wakad, Pune, Maharashtra, India", Destinations: ["Hinjawadi, Pune, Maharashtra, India"] -> "Wakad to Hinjawadi"
- Source: "Kothrud, Pune, Maharashtra, India", Destinations: ["Deccan Gymkhana, Pune, Maharashtra, India", "Shivajinagar, Pune, Maharashtra, India"] -> "Kothrud to Deccan/Shivajinagar"
- Source: "Pimple Saudagar, Pimpri-Chinchwad, Maharashtra, India", Destinations: ["Aundh, Pune, Maharashtra, India", "Baner, Pune, Maharashtra, India"] -> "Pimple Saudagar to Aundh/Baner"

Focus on the most specific, recognizable place names. Keep it short.

Source: {{source}}
Destinations:
{{#each destinations}}
- {{this}}
{{/each}}
`,
});

const generateRouteNameFlow = ai.defineFlow(
  {
    name: 'generateRouteNameFlow',
    inputSchema: GenerateRouteNameInputSchema,
    outputSchema: GenerateRouteNameOutputSchema,
  },
  async (input) => {
    const { output } = await generateRouteNamePrompt(input);
    return output!;
  }
);
