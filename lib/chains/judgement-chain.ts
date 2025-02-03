import { BaseChain } from "langchain/chains";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { AgentJudgement } from "../core/thread";
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

const responseSchema = z.object({
  satisfied: z.boolean().describe("Whether the response satisfies the requirements"),
  score: z.number().describe("A score between 0 and 100 based on the evaluation"),
  feedback: z.string().describe("Detailed explanation of the evaluation"),
  analysis: z.object({
    strengths: z.array(z.string()).describe("Strengths of the response"),
    weaknesses: z.array(z.string()).describe("Weaknesses of the response"),
    missing: z.array(z.string()).describe("Missing elements or gaps in the response")
  }).describe("Analysis of the response")
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
  public id: string;
  private model: ChatOpenAI;
  private prompt: PromptTemplate;

  constructor(input: JudgementChainInput) {
    super();
    this.id = crypto.randomUUID() as string;
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

  async _call(values: JudgementInput): Promise<{ agentJudgement: AgentJudgement }> {
    try {
      // Generate prompt
      const prompt = await this.prompt.format({
        requirement: values.input.requirement,
        response: values.input.response
      });

      const modeWithStructuredOutput = this.model.withStructuredOutput(responseSchema);

      let isValid = false;  
      let invokeCount = 0;
      let agentJudgement: AgentJudgement = {
        satisfied: false,
        score: 0,
        analysis: {
          strengths: [],
          weaknesses: [],
          missing: []
        },
        feedback: ""
      };

      while (!isValid && invokeCount < 3) {

        // Get completion from model
        const response = await modeWithStructuredOutput.invoke([
          { role: "system", content: prompt }
        ]);

        // Parse response into judgement
        agentJudgement = response as AgentJudgement;

        // Validate judgement
        const error = this.validateJudgement(agentJudgement);
        
        if (error) {
          invokeCount++;
          if (invokeCount >= 3) {
            throw error;
          }
        } else {
          isValid = true;
        }
      }

      return { agentJudgement };
    } catch (error) {
      throw new Error(`Failed to evaluate response: ${error}`);
    }
  }

  private validateJudgement(judgement: AgentJudgement): Error | null {
    if (typeof judgement.satisfied !== "boolean") {
      return new Error("Judgement must include a boolean satisfied flag");
    }

    if (typeof judgement.score !== "number" || judgement.score < 0 || judgement.score > 100) {
      return new Error("Judgement must include a score between 0 and 100");
    }

    if (!judgement.analysis || typeof judgement.analysis !== "object") {
      return new Error("Judgement must include an analysis object");
    }

    if (!Array.isArray(judgement.analysis.strengths)) {
      return new Error("Analysis must include a strengths array");
    }

    if (!Array.isArray(judgement.analysis.weaknesses)) {
      return new Error("Analysis must include a weaknesses array");
    }

    if (!Array.isArray(judgement.analysis.missing)) {
      return new Error("Analysis must include a missing array");
    }

    if (!judgement.feedback || typeof judgement.feedback !== "string") {
      return new Error("Judgement must include a feedback string");
    }

    return null;
  }
} 