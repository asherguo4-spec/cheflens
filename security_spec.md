# Firebase Security Specification - ChefLens

## Data Invariants
1. A recipe must have a title, content, userId, and server-side createdAt timestamp.
2. A user can only read and manage their own recipes (relational ownerId check).
3. Recipe IDs must match a standard alphanumeric pattern.

## The Dirty Dozen Payloads
1. **Identity Theft**: Attempt to save a recipe with someone else's `userId`.
2. **State Injection**: Attempt to bypass validation by providing an empty title or content.
3. **Ghost Field Update**: Attempt to add a `verified: true` field.
4. **Denial of Wallet**: Use a 1MB string as a document ID.
5. **PII Leak**: Attempt to list all recipes without a userId filter.
6. **Immutable Breach**: Attempt to change the `userId` or `createdAt` of a saved recipe.
7. **Role Escalation**: Attempt to set a custom claim or admin flag (not implemented, but rules should discard unknown fields).
8. **Malicious Markdowns**: Extremely long content strings (limit to 10k chars).
9. **Timestamp Spoofing**: Provide a future client-side timestamp.
10. **Cross-User Deletion**: Delete a recipe belonging to another UID.
11. **Anonymity Bypass**: Attempt writes as an unauthenticated user.
12. **Regex Poisoning**: Document IDs with illegal characters.

## Test Runner (Logic Overview)
The logic ensures:
- `request.auth.uid == resource.data.userId` for reads/deletes.
- `request.auth.uid == request.resource.data.userId` for creates.
- Strict schema validation via `isValidRecipe()`.
