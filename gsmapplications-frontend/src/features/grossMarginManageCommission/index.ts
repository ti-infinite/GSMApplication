// Public API for the "manage commissions" feature -- everything outside
// this slice imports from here, never from features/manage-commission/ui/*
// directly.
//
// CommissionCard/CommissionLogTable live here, not in entities/commission/,
// because both perform mutations (create/edit/delete) -- a user action
// (verb) per the FSD guide, not part of the noun's own representation.
export { CommissionCard } from "./ui/CommissionCard";
export { CommissionLogTable } from "./ui/CommissionLogTable";
