# Spec Delta

## ADDED Requirements

### Requirement: History from the editor
The editor's left column SHALL link to the history of the language being edited. When the editor has unsaved changes, following the link SHALL ask first, as leaving the editor does. After a restore of the language being edited, opening the editor SHALL show the restored document.

#### Scenario: Open the English history
- **WHEN** the owner edits English and follows the History link
- **THEN** the English history opens
