/**
 * Parses HTML into structured sections, preserving document hierarchy.
 * Splits by headings, numbered sections, and paragraphs.
 * Merges short sections and splits long ones for balanced analysis.
 */

export interface Section {
  title: string;
  content: string;
  level?: number; // heading level (1-6) if from a heading
}

function extractText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

  // Replace block-level tags with newlines
  text = text.replace(/<\/(p|div|li|h[1-6]|section|article|blockquote|br)>/gi, "\n");
  text = text.replace(/<h[1-6][^>]*>/gi, "\n");

  // Decode entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");

  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, " ");

  // Collapse whitespace
  text = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return text.trim();
}

/**
 * Extract headings and their levels from HTML
 */
function extractHeadings(html: string): Map<string, number> {
  const headings = new Map<string, number>();
  const headingRegex = /<h([1-6])[^>]*>([^<]+)<\/h[1-6]>/gi;
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const text = match[2].replace(/<[^>]+>/g, "").trim();
    if (text.length > 0) {
      headings.set(text, level);
    }
  }
  return headings;
}

function sentenceCount(text: string): number {
  return (text.match(/[.!?]+/g) || []).length;
}

function paragraphCount(text: string): number {
  return text.split("\n").filter((line) => line.length > 0).length;
}

/**
 * Intelligently split text into sections based on document structure
 */
export function parseHtmlToSections(html: string): Section[] {
  const fullText = extractText(html);
  const headings = extractHeadings(html);

  const lines = fullText.split("\n");
  const sections: Section[] = [];
  let currentSection: { title: string; lines: string[]; level?: number } | null = null;

  for (const line of lines) {
    // Check if this line is a heading
    const headingLevel = headings.get(line);
    if (headingLevel !== undefined) {
      // Save previous section if exists
      if (currentSection && currentSection.lines.length > 0) {
        sections.push({
          title: currentSection.title,
          content: currentSection.lines.join("\n"),
          level: currentSection.level,
        });
      }
      // Start new section
      currentSection = {
        title: line,
        lines: [],
        level: headingLevel,
      };
    } else if (line.trim().length > 0) {
      // Check for numbered sections (1., 1.1, 2) Section, etc.
      const numberedMatch = line.match(/^(\d+(?:\.\d+)*)\s*[.)\-:]\s*(.+)/);
      if (numberedMatch && !currentSection) {
        sections.push({
          title: line.split("\n")[0],
          content: line,
        });
      } else if (currentSection) {
        currentSection.lines.push(line);
      } else {
        // Start unnamed section if we haven't yet
        currentSection = {
          title: `Section ${sections.length + 1}`,
          lines: [line],
        };
      }
    }
  }

  // Save last section
  if (currentSection && currentSection.lines.length > 0) {
    sections.push({
      title: currentSection.title,
      content: currentSection.lines.join("\n"),
      level: currentSection.level,
    });
  }

  // Post-process: merge very short sections, split very long ones
  return balanceSections(sections);
}

function balanceSections(sections: Section[]): Section[] {
  const balanced: Section[] = [];
  let buffer: Section | null = null;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sentences = sentenceCount(section.content);
    const paragraphs = paragraphCount(section.content);

    // Very short section (< 2 sentences) — merge with next
    if (sentences < 2) {
      if (buffer) {
        buffer.content += "\n\n" + section.content;
        buffer.title += " & " + section.title;
      } else {
        buffer = { ...section };
      }
      continue;
    }

    // Very long section (> 4 paragraphs) — split by paragraph
    if (paragraphs > 4) {
      if (buffer) {
        balanced.push(buffer);
        buffer = null;
      }
      const splitSections = splitLongSection(section);
      balanced.push(...splitSections);
      continue;
    }

    // Normal section
    if (buffer) {
      buffer.content += "\n\n" + section.content;
      balanced.push(buffer);
      buffer = null;
    } else {
      balanced.push(section);
    }
  }

  // Don't forget remaining buffer
  if (buffer) {
    balanced.push(buffer);
  }

  return balanced.filter((s) => s.content.trim().length >= 20);
}

function splitLongSection(section: Section): Section[] {
  const paragraphs = section.content.split("\n").filter((p) => p.trim().length > 0);
  const result: Section[] = [];
  let current: string[] = [];
  let currentCount = 0;

  for (const para of paragraphs) {
    current.push(para);
    currentCount += sentenceCount(para);

    // Split after every ~2-3 sentences
    if (currentCount >= 2) {
      result.push({
        title: `${section.title} (cont.)`,
        content: current.join("\n"),
        level: section.level,
      });
      current = [];
      currentCount = 0;
    }
  }

  // Add remainder
  if (current.length > 0) {
    result.push({
      title: `${section.title} (cont.)`,
      content: current.join("\n"),
      level: section.level,
    });
  }

  return result.length > 0 ? result : [section];
}
