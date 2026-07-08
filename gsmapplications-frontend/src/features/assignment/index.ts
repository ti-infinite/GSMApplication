// Public API of the assignment feature: the wizard that configures products and
// assigns employees, plus the payload builder for the resulting transactions.
export { AssignmentWizard } from './ui/AssignmentWizard'
export { buildTransactionPayload } from './lib/transactionPayload'
export type { AssignmentResult } from './model/types'
