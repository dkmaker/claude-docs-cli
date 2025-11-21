/**
 * Markdown transformer - converts MDX to standard markdown
 * Zero dependencies - uses string transformations and regex
 *
 * Transforms:
 * 1. MDX Callouts (<Note>, <Tip>, <Warning>) → Blockquotes
 * 2. MDX Cards (<CardGroup>, <Card>) → Bullet lists
 * 3. MDX Tabs (<Tabs>, <Tab>) → Sections
 * 4. MDX Steps (<Steps>, <Step>) → Numbered lists
 * 5. Code block attributes removal (theme={null})
 * 6. Internal links transformation (/en/slug → CLI commands)
 */

/**
 * Transform MDX callout components to blockquotes
 *
 * <Note>text</Note> → > 📝 Note: text
 * <Tip>text</Tip> → > 💡 Tip: text
 * <Warning>text</Warning> → > ⚠️ Warning: text
 *
 * @param content - Markdown content
 * @returns Transformed content
 */
export function transformCallouts(content: string): string {
  let result = content;

  // Transform <Note> tags
  result = result.replace(/<Note>\s*/gi, '\n> **📝 Note:**  \n> ');
  result = result.replace(/<\/Note>/gi, '\n\n');

  // Transform <Tip> tags
  result = result.replace(/<Tip>\s*/gi, '\n> **💡 Tip:**  \n> ');
  result = result.replace(/<\/Tip>/gi, '\n\n');

  // Transform <Warning> tags
  result = result.replace(/<Warning>\s*/gi, '\n> **⚠️ Warning:**  \n> ');
  result = result.replace(/<\/Warning>/gi, '\n\n');

  // Transform <Info> tags (if present)
  result = result.replace(/<Info>\s*/gi, '\n> **ℹ️ Info:**  \n> ');
  result = result.replace(/<\/Info>/gi, '\n\n');

  return result;
}

/**
 * Transform MDX card components to bullet lists
 *
 * <CardGroup cols={2}>
 *   <Card title="Title">Description</Card>
 * </CardGroup>
 * →
 * - **Title**: Description
 *
 * @param content - Markdown content
 * @returns Transformed content
 */
export function transformCards(content: string): string {
  let result = content;

  // Remove CardGroup opening tags
  result = result.replace(/<CardGroup[^>]*>/gi, '\n');

  // Remove CardGroup closing tags
  result = result.replace(/<\/CardGroup>/gi, '\n');

  // Transform Card components
  // Matches: <Card title="Title">Content</Card>
  result = result.replace(/<Card\s+title="([^"]+)"[^>]*>(.*?)<\/Card>/gis, (_, title, content) => {
    const cleanContent = content.trim();
    return `\n- **${title}**: ${cleanContent}\n`;
  });

  // Handle Card with icon attribute
  result = result.replace(
    /<Card\s+title="([^"]+)"\s+icon="[^"]*"[^>]*>(.*?)<\/Card>/gis,
    (_, title, content) => {
      const cleanContent = content.trim();
      return `\n- **${title}**: ${cleanContent}\n`;
    },
  );

  return result;
}

/**
 * Transform MDX tabs to sections
 *
 * <Tabs>
 *   <Tab title="Tab1">Content1</Tab>
 *   <Tab title="Tab2">Content2</Tab>
 * </Tabs>
 * →
 * ### Tab1
 * Content1
 * ### Tab2
 * Content2
 *
 * @param content - Markdown content
 * @returns Transformed content
 */
export function transformTabs(content: string): string {
  let result = content;

  // Remove Tabs opening tags
  result = result.replace(/<Tabs[^>]*>/gi, '\n');

  // Remove Tabs closing tags
  result = result.replace(/<\/Tabs>/gi, '\n');

  // Transform Tab components
  result = result.replace(/<Tab\s+title="([^"]+)"[^>]*>(.*?)<\/Tab>/gis, (_, title, content) => {
    const cleanContent = content.trim();
    return `\n### ${title}\n\n${cleanContent}\n`;
  });

  return result;
}

/**
 * Transform MDX steps to numbered lists
 *
 * <Steps>
 *   <Step>First step</Step>
 *   <Step>Second step</Step>
 * </Steps>
 * →
 * 1. First step
 * 2. Second step
 *
 * @param content - Markdown content
 * @returns Transformed content
 */
export function transformSteps(content: string): string {
  let result = content;

  // Process each Steps block
  result = result.replace(/<Steps[^>]*>(.*?)<\/Steps>/gis, (_, stepsContent) => {
    // Extract individual steps
    const steps: string[] = [];
    const stepRegex = /<Step[^>]*>(.*?)<\/Step>/gis;
    let match: RegExpExecArray | null;

    while ((match = stepRegex.exec(stepsContent)) !== null) {
      if (match[1]) {
        steps.push(match[1].trim());
      }
    }

    // Convert to numbered list
    const numberedList = steps.map((step, index) => `${index + 1}. ${step}`).join('\n');

    return `\n${numberedList}\n`;
  });

  return result;
}

/**
 * Remove code block attributes (MDX-specific)
 *
 * ```typescript theme={null}
 * →
 * ```typescript
 *
 * @param content - Markdown content
 * @returns Transformed content
 */
export function transformCodeBlocks(content: string): string {
  let result = content;

  // Remove theme attributes from code fences
  result = result.replace(/```(\w+)\s+theme=\{[^}]+\}/g, '```$1');

  // Remove other common attributes
  result = result.replace(/```(\w+)\s+\{[^}]+\}/g, '```$1');

  // Remove showLineNumbers attribute
  result = result.replace(/```(\w+)\s+showLineNumbers/g, '```$1');

  return result;
}

/**
 * Transform internal documentation links to CLI command references
 *
 * [Link](/en/plugins) → `claude-docs get plugins`
 * [Link](/docs/en/hooks) → `claude-docs get hooks`
 *
 * @param content - Markdown content
 * @returns Transformed content
 */
export function transformInternalLinks(content: string): string {
  let result = content;

  // Transform internal links to plain text with CLI commands
  // [Link Text](/en/slug) → Link Text - Read with `claude-docs get slug`
  // [Link Text](/en/slug#anchor) → Link Text - Read with `claude-docs get slug#anchor`
  result = result.replace(/\[([^\]]+)\]\(\/(?:docs\/)?en\/([^)]+)\)/g, (_, text, slug) => {
    // Keep the full slug including anchor
    return `${text} - Read with \`claude-docs get ${slug}\``;
  });

  return result;
}

/**
 * Transform MCP component tags
 * Removes <MCPServersTable /> tags since we don't have the JavaScript to process
 *
 * @param content - Markdown content
 * @returns Transformed content
 */
export function transformMcpComponent(content: string): string {
	let result = content;

	// Check if there's a JavaScript servers array to process
	const hasServersArray = /const servers = \[\{/.test(content);

	if (hasServersArray) {
		// TODO: Extract JavaScript array and generate table
		// For now, just remove the component
		result = result.replace(/<MCPServersTable[^>]*\/>/g, '\n> **Note:** MCP servers table processing not yet implemented in Node.js version.\n');
		result = result.replace(/^export const MCPServersTable[\s\S]*?^};$/gm, '');
	} else {
		// No JavaScript array - just remove the tag (server-side rendered content)
		result = result.replace(/<MCPServersTable[^>]*\/>/g, '');
	}

	// Remove export const MCPServersTable (if present)
	result = result.replace(/^export const MCPServersTable[\s\S]*?^};$/gm, '');

	return result;
}

/**
 * Clean up extra whitespace and normalize line endings
 *
 * @param content - Markdown content
 * @returns Cleaned content
 */
export function cleanWhitespace(content: string): string {
  let result = content;

  // Normalize line endings to \n
  result = result.replace(/\r\n/g, '\n');

  // Remove trailing whitespace from lines
  result = result.replace(/[ \t]+$/gm, '');

  // Remove more than 2 consecutive blank lines
  result = result.replace(/\n{3,}/g, '\n\n');

  // Ensure file ends with single newline
  result = result.trim() + '\n';

  return result;
}

/**
 * Apply all markdown transformations
 * This is the main entry point for transforming MDX to standard markdown
 *
 * @param content - MDX content
 * @returns Transformed standard markdown
 *
 * @example
 * ```typescript
 * const mdxContent = await readFile('doc.mdx', 'utf-8');
 * const markdown = transformMarkdown(mdxContent);
 * await writeFile('doc.md', markdown);
 * ```
 */
export function transformMarkdown(content: string): string {
  let result = content;

  // Apply transformations in order
  result = transformCallouts(result);
  result = transformCards(result);
  result = transformTabs(result);
  result = transformSteps(result);
  result = transformCodeBlocks(result);
  result = transformMcpComponent(result);
  result = transformInternalLinks(result);
  result = cleanWhitespace(result);

  return result;
}
