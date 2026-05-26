---
name: spec
description: Create and maintain specification.xml — a structured XML summary of the project's features, UI, build config, scripts, database schema, API integration, and architecture. Use when starting a new project, adding features, updating architecture, or whenever the user asks to document the project specs.
---

# Specification XML

## Purpose

`specification.xml` is a single structured document at the project root that captures the complete specification of the project. It serves as a living, machine-readable counterpart to README.md. Unlike README (which is prose for humans), specification.xml uses a predictable XML schema that both humans and tools can parse.

## When to Create or Update

- **Create**: On a fresh project after the initial scaffold and a few features are built. The agent should read enough of the codebase to populate each section accurately.
- **Update**: Whenever a feature is added, a UI flow changes, the database schema evolves, the build config changes, or the tech stack is modified. The agent should update the relevant sections incrementally — do NOT rewrite the whole file from scratch for small changes.
- **On request**: User says "update spec", "create specification.xml", or similar.

## How to Gather Information

Before writing or updating `specification.xml`, the agent should inspect:

1. **`package.json`** / **`Cargo.toml`** / build files — for dependencies, scripts, project metadata
2. **Source directories** (`src/`, `src-tauri/`, etc.) — for pages, components, routes, database modules
3. **Config files** (`.env`, `vite.config.ts`, `tauri.conf.json`, etc.) — for build settings, environment variables
4. **Database migration files** — for schema
5. **API client code** (`src/server/`, OpenAPI specs) — for backend integration
6. **UI component tree** — for navigation, pages, components
7. **Existing documentation** (README.md, CLAUDE.md, backend-docs/) — for project overview

Read relevant files; do not guess. If unsure about a section, leave a `<!-- TODO -->` comment.

## XML Schema

The file must have a root `<specification>` element. Below are the supported sections, in recommended order. Not all sections are required — include only what applies to the project.

### Top-Level Elements

```xml
<specification>
  <title>Project Name</title>
  <description>A concise 1-3 sentence summary of what the project does.</description>
  <backend_docs href="path/to/openapi.yaml" />  <!-- optional -->

  <!-- sections below -->
</specification>
```

### Sections (all optional, use only what applies)

| Section | When to use |
|---------|-------------|
| `<authentication>` | App has login, token, or session management |
| `<navigation>` | Multi-page/route app with `<route>` children |
| `<page name="...">` | Significant pages with UI, forms, behavior details |
| `<database>` | Local database (SQLite, IndexedDB, etc.) |
| `<field_mapping>` | Mapping between local schema and API DTOs |
| `<sync>` | Bidirectional or unidirectional data sync |
| `<logging>` | Structured logging behavior |
| `<ui_notes>` | Theme, tech stack, design system |
| `<project_structure>` | Key directories and files |
| `<error_handling>` | Global error handling patterns |
| `<next_features>` | Planned features with status |
| `<open_questions>` | TODOs, unresolved decisions |

### Formatting Rules

1. **Be consistent**: Use same tag names, nesting patterns, and attribute conventions throughout.
2. **Use `<description>`** for prose inside any section rather than comments.
3. **Use attributes** for metadata: `name`, `type`, `href`, `status`, `engine`, `orm`, etc.
4. **Use `<entry key="...">`** for key-value configuration items.
5. **Use `<case name="...">`**, `<rule name="...">`, or `<item name="...">` for lists of items with identifiers.
6. **Values in text content**: Place the actual value/number/string inside the element text (e.g., `<column name="price" type="REAL" nullable="false" />`).
7. **Comments**: Use `<!-- section label -->` before major sections for readability. Keep them on their own line.
8. **XML escaping**: Escape `&` as `&amp;`, `<` as `&lt;`, `>` as `&gt;` in text content.

### Incremental Updates

When updating an existing `specification.xml`:

- Match the existing style, nesting conventions, and attribute usage exactly.
- Add new elements in the same section if they belong there.
- Update existing elements' text/attributes rather than deleting and re-creating them.
- If a new section is needed, insert it in a logical position among existing sections.
- Preserve existing comments and formatting.
- Do NOT reorder or reformat sections that haven't changed.

### Example

See the reference example below for a complete specification.xml from an Android/Kotlin project. Adapt the structure to the current project's tech stack (e.g., for a Tauri/React project, use web-oriented sections instead of Android-specific ones).

<details>
<summary>Full example (Android/Kotlin project)</summary>

```xml
<specification>
  <title>Stok</title>
  <description>
    A mobile Android app that stores product information locally (SQLite/Room),
    manages inventory with event-sourced stock tracking, and syncs bidirectionally
    with a cloud backend.
  </description>
  <backend_docs href="backend-docs/openapi.yaml" />

  <authentication>
    <purpose>
      Token-based auth. Token is stored in Android SharedPreferences.
      Sent as `Authorization: Bearer &lt;token&gt;` header on all API requests.
    </purpose>
    <flow>
      <step order="1">On launch, check if a token exists locally.</step>
      <step order="2">If no token → show Login page.</step>
      <step order="3">If token exists → proceed directly to Home page.</step>
    </flow>
    <login_page>
      <description>Minimal page with a single token input and a submit button.</description>
      <ui>
        <field name="token" type="text" label="Token" placeholder="Masukkan token" />
        <button name="submit" label="Masuk" />
      </ui>
      <behaviour>
        On submit: POST the token to POST /api/login/token.
        <response>
          <case status="200">Store token, navigate to Home.</case>
          <case status="400">Show server error inline.</case>
          <case status="network_error">Show hardcoded message.</case>
        </response>
      </behaviour>
    </login_page>
  </authentication>

  <navigation>
    <route name="login"><description>Shown when no token is present.</description></route>
    <route name="home"><description>Main landing page after login.</description></route>
    <route name="settings"><description>Token management, logs, logout.</description></route>
    <route name="stock_list"><description>Browsable, searchable list of products.</description></route>
  </navigation>

  <page name="stock.list">
    <navbar>
      <component name="search_bar" type="text_input">
        <description>Fuzzy search against product name and barcode.</description>
      </component>
    </navbar>
    <product_list>
      <description>LazyColumn of ProductCard composables.</description>
      <card>
        <layout>Left: name, barcode, stock badge. Right: price, capital, edit button.</layout>
      </card>
    </product_list>
    <fab>
      <description>FloatingActionButton at bottom-right. Navigates to create mode.</description>
    </fab>
  </page>

  <database engine="sqlite" orm="room">
    <table name="products" room_entity="ProductEntity">
      <column name="id" type="TEXT" primary_key="true" />
      <column name="name" type="TEXT" nullable="false" />
      <column name="price" type="REAL" nullable="false" />
    </table>
    <local_config>
      <entry key="token" storage="SharedPreferences" />
    </local_config>
  </database>

  <field_mapping>
    <entity name="product" dto="ProductDto">
      <field local="id" api="id" direction="both" />
      <field local="name" api="name" direction="both" />
    </entity>
  </field_mapping>

  <sync>
    <description>Bidirectional sync: grave → products → events.</description>
    <stage_group name="products" order="1">
      <stage name="pull">GET /api/product/count/{ts} → GET /api/product/{ts} in batches.</stage>
      <stage name="push">POST /api/product with unsynced local products.</stage>
    </stage_group>
  </sync>

  <ui_notes>
    <theme>Material Design 3 with green seed palette. Light and dark themes.</theme>
    <tech_stack>
      <item name="language">Kotlin 2.1.0</item>
      <item name="ui">Jetpack Compose, Material 3</item>
      <item name="http">Retrofit + OkHttp</item>
      <item name="database">Room (KSP)</item>
    </tech_stack>
  </ui_notes>

  <project_structure>
    <package root="com.example">
      <dir name="data/local"><file>AppDatabase.kt</file></dir>
      <dir name="ui"><file>MainActivity.kt</file></dir>
    </package>
    <config>
      <file>app/build.gradle.kts</file>
    </config>
  </project_structure>

  <next_features>
    <feature name="background_sync" status="planned">
      <description>Allow sync when navigating away.</description>
    </feature>
  </next_features>

  <open_questions>
    <item name="proguard" status="TODO">R8 rules not yet configured.</item>
  </open_questions>
</specification>
```

</details>
