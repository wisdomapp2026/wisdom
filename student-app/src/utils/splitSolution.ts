/**
 * Bitta uzun yechim matnini avtomatik qadamlarga ajratish.
 * 
 * Admin bitta maydonga butun yechimni yozadi — bu funksiya uni
 * student uchun qadam-baqadam ko'rsatish uchun bo'laklarga ajratadi.
 * 
 * Ajratish qoidalari (priority bo'yicha):
 * 1. "---" yoki "===" separator bo'lsa — shu joydan kesish
 * 2. "\n\n\n" (3+ bo'sh qator) — yangi qadam
 * 3. Har bir \[...\] display formula oldidagi matn bilan birga — alohida qadam
 * 4. "\n\n" (2 bo'sh qator) — yangi qadam (agar boshqasi ishlamasa)
 */
export function splitSolutionIntoSteps(text: string): string[] {
  if (!text || !text.trim()) return [];

  // 1. Agar "---" yoki "===" bilan ajratilgan bo'lsa
  if (text.includes("\n---\n") || text.includes("\n===\n")) {
    const separator = text.includes("\n---\n") ? "\n---\n" : "\n===\n";
    const parts = text.split(separator).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts;
  }

  // 2. 3+ bo'sh qator bilan ajratish
  const tripleNewlineParts = text.split(/\n{3,}/).map((s) => s.trim()).filter(Boolean);
  if (tripleNewlineParts.length > 1) return tripleNewlineParts;

  // 3. Display math (\[...\]) bloklar bo'yicha ajratish
  // Har bir \[...\] blokini oldidagi matn bilan birga bitta qadam qilish
  const displayMathRegex = /\\\[[\s\S]*?\\\]/g;
  const hasDisplayMath = displayMathRegex.test(text);
  
  if (hasDisplayMath) {
    const steps: string[] = [];
    // Matnni \[...\] bloklari bo'yicha bo'lish
    // Har bir blok = oldingi oddiy matn + formula
    const parts = text.split(/(\\\[[\s\S]*?\\\])/);
    let currentStep = "";
    
    for (const part of parts) {
      if (!part.trim()) continue;
      
      const isFormula = /^\\\[/.test(part.trim());
      
      if (isFormula) {
        // Formula — oldingi matn bilan birga bitta qadam
        currentStep += part;
        // Agar oldingi matn + formula yetarli bo'lsa, qadamni yakunlash
        if (currentStep.trim()) {
          steps.push(currentStep.trim());
          currentStep = "";
        }
      } else {
        // Oddiy matn
        // Agar matn ichida \n\n bor bo'lsa, paragraflarni alohida qadam qilish
        const paragraphs = part.split(/\n\n+/).filter((p) => p.trim());
        if (paragraphs.length > 1 && currentStep) {
          // Avvalgi to'plangan qadamni saqlash
          steps.push(currentStep.trim());
          currentStep = "";
          // Har bir paragraf = alohida qadam (lekin juda kichiklar emas)
          for (const p of paragraphs) {
            currentStep += p + "\n\n";
          }
        } else {
          currentStep += part;
        }
      }
    }
    
    // Oxirgi qolgan matn
    if (currentStep.trim()) {
      steps.push(currentStep.trim());
    }
    
    if (steps.length > 1) return steps;
  }

  // 4. Oddiy \n\n bilan ajratish (minimal 2 paragraf)
  const doubleParts = text.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
  if (doubleParts.length > 1) {
    // Juda kichik qadamlarni birlashtirish (har biri minimal 20 belgidan)
    const merged: string[] = [];
    let buffer = "";
    for (const part of doubleParts) {
      buffer += (buffer ? "\n\n" : "") + part;
      // Agar yetarlicha katta bo'lsa yoki formula bo'lsa — qadam sifatida saqlash
      if (buffer.length > 30 || buffer.includes("\\[") || buffer.includes("$$")) {
        merged.push(buffer);
        buffer = "";
      }
    }
    if (buffer) {
      if (merged.length > 0) {
        merged[merged.length - 1] += "\n\n" + buffer;
      } else {
        merged.push(buffer);
      }
    }
    if (merged.length > 1) return merged;
  }

  // Hech narsa ishlamasa — bitta qadam
  return [text];
}
