// Public API for the "manage commissions" feature -- everything outside
// this slice imports from here, never from
// features/manage-commission/ui/* directly.
//
// REFACTOR_PLAN.md phase 06 (develop/develop2 reconciliation): CommissionCard
// (the add form) and CommissionLogTable (the editable list) used to live in
// entities/commission/ui/ alongside the entity's own model/api. Moved here
// because both perform mutations -- create, edit, delete -- which is a user
// action (a verb) per the FSD decision guide, not part of the noun's own
// representation. The entity keeps only its type + CRUD bindings.
export { CommissionCard } from "./ui/CommissionCard";
export { CommissionLogTable } from "./ui/CommissionLogTable";
