import { BaseChain } from "langchain/chains";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { Judgement } from "../../types";
import { z } from "zod";

const JUDGEMENT_TEMPLATE = `You are a judgement assistant. Your role is to evaluate if a response satisfies the given requirements.

Requirements:
{requirement}

Response to evaluate:
{response}

Evaluate the response based on:
1. Satisfaction of requirements
2. Accuracy and correctness
3. Completeness
4. Missing elements or gaps
`;

// Respond with a JSON object in this format:
// {
//   "satisfied": true/false,
//   "score": 0-100,
//   "analysis": {
//     "strengths": ["point1", "point2"],
//     "weaknesses": ["point1", "point2"],
//     "missing": ["element1", "element2"]
//   },
//   "feedback": "Detailed explanation of the evaluation"
// }`;

const responseSchema = z.object({
  satisfied: z.boolean().describe("Whether the response satisfies the requirements"),
  score: z.number().describe("A score between 0 and 100 based on the evaluation"),
  analysis: z.object({
    strengths: z.array(z.string()).describe("Strengths of the response"),
    weaknesses: z.array(z.string()).describe("Weaknesses of the response"),
    missing: z.array(z.string()).describe("Missing elements or gaps in the response")
  }).describe("Analysis of the response"),
  feedback: z.string().describe("Detailed explanation of the evaluation")
});

interface JudgementInput {
  input: {
    requirement: string;
    response: string;
  }
}

interface JudgementChainInput {
  model: ChatOpenAI;
}

export class JudgementChain extends BaseChain {
  private model: ChatOpenAI;
  private prompt: PromptTemplate;

  constructor(input: JudgementChainInput) {
    super();
    this.model = input.model;
    this.prompt = new PromptTemplate({
      template: JUDGEMENT_TEMPLATE,
      inputVariables: ["requirement", "response"]
    });
  }

  _chainType(): string {
    return "judgement_chain";
  }

  get inputKeys(): string[] {
    return ["requirement", "response"];
  }

  get outputKeys(): string[] {
    return ["judgement"];
  }

  async _call(values: JudgementInput): Promise<{ judgement: Judgement }> {
    try {
      // Generate prompt
      const prompt = await this.prompt.format({
        requirement: values.input.requirement,
        response: values.input.response
      });

      const modeWithStructuredOutput = this.model.withStructuredOutput(responseSchema);

      // Get completion from model
      const response = await modeWithStructuredOutput.invoke([
        { role: "system", content: prompt }
      ]);

      // Parse response into judgement
      // const judgement = JSON.parse(response.content as string) as Judgement;
      const judgement = response as Judgement;

      // Validate judgement
      this.validateJudgement(judgement);

      return { judgement };
    } catch (error) {
      throw new Error(`Failed to evaluate response: ${error}`);
    }
  }

  private validateJudgement(judgement: Judgement): void {
    if (typeof judgement.satisfied !== "boolean") {
      throw new Error("Judgement must include a boolean satisfied flag");
    }

    if (typeof judgement.score !== "number" || judgement.score < 0 || judgement.score > 100) {
      throw new Error("Judgement must include a score between 0 and 100");
    }

    if (!judgement.analysis || typeof judgement.analysis !== "object") {
      throw new Error("Judgement must include an analysis object");
    }

    if (!Array.isArray(judgement.analysis.strengths)) {
      throw new Error("Analysis must include a strengths array");
    }

    if (!Array.isArray(judgement.analysis.weaknesses)) {
      throw new Error("Analysis must include a weaknesses array");
    }

    if (!Array.isArray(judgement.analysis.missing)) {
      throw new Error("Analysis must include a missing array");
    }

    if (!judgement.feedback || typeof judgement.feedback !== "string") {
      throw new Error("Judgement must include a feedback string");
    }
  }
} 