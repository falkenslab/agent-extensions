---
name: brand
description: Brand kits and brand templates in Canva through Canva's official MCP server - the person's or their school's colours, fonts and templates, a design from a brand template and its fillable fields, drafting and publishing a template - and what to offer on a Canva plan without them. Use when the person wants a design in their own or their school's style, or asks about brand kits or templates.
---

# Brand kits and templates in Canva

Brand kits and brand templates are Canva Pro and above (Canva for Education and Teams have them; Free doesn't). Reading them needs no yes; creating a design from a template, drafting a template or publishing one each waits for the person's yes, asked as `designs` says ("The yes before creating or changing").

## First, what there is

- **`list-brand-kits`**: the person's kits (colours, fonts, logos). If it fails or is empty on a Free plan, say that brand kits need another plan, and offer what Free allows: telling `create-design` the colours and fonts by name, or copying a design they already have in their style (`copy-design`, see `designs`).
- **`search-brand-templates`**: their brand templates. Their school's, when they belong to a team, come first when the person mentions the school.

## A design in the brand

- **From a brand template**: `get-brand-template-dataset` says which fields it has (texts, images); ask the person for each one, then `create-design-from-brand-template` with them. `get-design-dataset` does the same for a design's fillable fields.
- **From a description, in the brand**: the older path (`generate-design` with the brand, then `create-design-from-candidate`, see `designs`) is the one that applies a brand kit.

## Making templates

`create-brand-template-draft` makes an editable draft of a brand template; `publish-brand-template` publishes a design as one, for everyone in the person's team. Publishing reaches others: say who will see it and ask first.
