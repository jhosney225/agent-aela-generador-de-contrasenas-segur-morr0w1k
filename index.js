
```javascript
import Anthropic from "@anthropic-ai/sdk";
import * as crypto from "crypto";
import * as readline from "readline";

const client = new Anthropic();

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

class PasswordGenerator {
  private conversationHistory: ConversationMessage[] = [];

  async analyzePassword(password: string): Promise<number> {
    const charsetSize = this.calculateCharsetSize(password);
    const entropy = password.length * Math.log2(charsetSize);
    return entropy;
  }

  private calculateCharsetSize(password: string): number {
    let size = 0;
    if (/[a-z]/.test(password)) size += 26;
    if (/[A-Z]/.test(password)) size += 26;
    if (/[0-9]/.test(password)) size += 10;
    if (/[^a-zA-Z0-9]/.test(password)) size += 32;
    return size;
  }

  async generatePassword(requirements: string): Promise<string> {
    this.conversationHistory.push({
      role: "user",
      content: `Generate a secure password based on these requirements: ${requirements}. 
      Provide ONLY the password, nothing else. No quotes, no explanation.`,
    });

    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 100,
      messages: this.conversationHistory,
    });

    const assistantMessage =
      response.content[0].type === "text" ? response.content[0].text : "";
    const password = assistantMessage.trim().replace(/["`]/g, "");

    this.conversationHistory.push({
      role: "assistant",
      content: assistantMessage,
    });

    return password;
  }

  async evaluatePasswordSecurity(password: string): Promise<string> {
    this.conversationHistory.push({
      role: "user",
      content: `Evaluate the security of this password: "${password}". 
      Provide a brief assessment including: 
      1. Entropy level
      2. Potential vulnerabilities
      3. Strength rating
      Keep it concise (2-3 sentences).`,
    });

    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 200,
      messages: this.conversationHistory,
    });

    const assistantMessage =
      response.content[0].type === "text" ? response.content[0].text : "";

    this.conversationHistory.push({
      role: "assistant",
      content: assistantMessage,
    });

    return assistantMessage;
  }

  async comparePasswords(password1: string, password2: string): Promise<string> {
    this.conversationHistory.push({
      role: "user",
      content: `Compare the security of these two passwords: "${password1}" vs "${password2}". 
      Which one is more secure and why? Keep it brief (2-3 sentences).`,
    });

    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 200,
      messages: this.conversationHistory,
    });

    const assistantMessage =
      response.content[0].type === "text" ? response.content[0].text : "";

    this.conversationHistory.push({
      role: "assistant",
      content: assistantMessage,
    });

    return assistantMessage;
  }

  getEntropyBar(entropy: number): string {
    const maxEntropy = 200;
    const filledBars = Math.min(
      Math.floor((entropy / maxEntropy) * 50),
      50
    );
    const emptyBars = 50 - filledBars;
    return (
      "[" +
      "█".repeat(filledBars) +
      "░".repeat(emptyBars) +
      "] " +
      entropy.toFixed(2) +
      " bits"
    );
  }

  getSecurityLevel(entropy: number): string {
    if (entropy < 40) return "🔴 Very Weak";
    if (entropy < 60) return "🟠 Weak";
    if (entropy < 80) return "🟡 Fair";
    if (entropy < 120) return "🟢 Strong";
    return "🟢 Very Strong";
  }
}

async function main(): Promise<void> {
  const generator = new PasswordGenerator();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  console.log("\n🔐 Secure Password Generator with Entropy Meter");
  console.log("============================================\n");

  let continueSession = true;

  while (continueSession) {
    console.log("\nOptions:");
    console.log("1. Generate a new password");
    console.log("2. Evaluate password security");
    console.log("3. Compare two passwords");
    console.log("4. Exit");

    const choice = await question("\nSelect option (1-4): ");

    switch (choice) {
      case "1": {
        const requirements = await question(
          "Enter password requirements (e.g., 16 chars, uppercase, numbers, special chars): "
        );
        try {
          console.log("\n🔄 Generating password...");
          const password = await generator.generatePassword(requirements);
          console.log(`\n✅ Generated Password: ${password}`);

          const entropy = await generator.analyzePassword(password);
          console.log(
            `\n📊 Entropy Analysis:\n${generator.getEntropyBar