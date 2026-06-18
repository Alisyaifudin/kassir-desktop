---
name: grill-me
description: 'Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me".'
---

# Grill Me

Stress-test a plan or design by walking down every branch of the decision tree, resolving dependencies one-by-one until reaching shared understanding.

## When to Use

- User wants to stress-test a plan before implementation
- User says "grill me" or "interview me" about their design
- User wants to catch edge cases, ambiguities, or missing decisions before coding

## Procedure

### 1. Load Context

- Read the current plan/session memory to understand what's being discussed
- Explore the codebase to answer factual questions (don't ask what you can find)
- Identify the scope: what system/feature is being designed

### 2. Build the Question Tree

For each major decision in the plan, identify:

- **Dependencies**: What other decisions does this depend on?
- **Ambiguities**: What's unclear or could go multiple ways?
- **Edge cases**: What happens in failure modes?
- **Assumptions**: What's being assumed without evidence?

### 3. Interview Loop

Ask questions **one at a time** in this order:

1. **Data model** — What are the entities? What fields? What relationships?
2. **Happy path** — What does success look like step-by-step?
3. **Error handling** — What can fail? How should failures surface?
4. **Edge cases** — Empty inputs? Duplicates? Concurrent access? Race conditions?
5. **Validation** — What inputs need checking? Where does validation live?
6. **Performance** — Any N+1 queries? Unnecessary round-trips? Can batching help?
7. **Security** — Any injection risks? Auth/authorization gaps?
8. **Testing** — How will this be verified? Manual? Automated?

For each question:

- Provide your **recommended answer** based on codebase patterns
- Explain **why** (reference existing code, schema, or conventions)
- Let the user confirm or override

### 4. Resolve Dependencies

When a decision depends on another unresolved decision:

- Flag the dependency explicitly
- Resolve the dependency first
- Then revisit the dependent decision

### 5. Document in specification.xml

After each question is resolved, append to `specification.xml`:

```xml
<specification>
  <decision topic="capital-stock-update" resolved="2026-06-18">
    <question>When a capital row exists with matching capital_capital, how should stock be updated?</question>
    <answer>Accumulate (capital_stock += product.qty)</answer>
    <rationale>Standard inventory behavior; matches how del-by-id.ts computes undo stock</rationale>
    <alternatives>Replace (capital_stock = product.qty)</alternatives>
  </decision>
</specification>
```

### 6. Completion Check

Stop when:

- All major decisions are resolved
- No unresolved dependencies remain
- Edge cases are documented with answers
- The user confirms the spec is complete

## Output Format

The `specification.xml` file should contain:

- All resolved decisions with rationale
- Edge cases and their handling
- Any deferred decisions (with justification)
- A summary section linking decisions together

## Tips

- **Don't ask what you can find** — explore the codebase first
- **Follow the dependency chain** — resolve foundational decisions first
- **Be specific** — "What about X?" is better than "Any concerns?"
- **Reference existing patterns** — "del-by-id.ts does Y, should we follow that?"
- **Challenge assumptions** — "You assumed Z, but what if...?"
