// Employee domain model — a person who performs work. Tenant-agnostic.

// Employee.idEmployee is numeric from backend (EmployeeDTO pending Id field)
export interface Employee {
  id:          string   // internal UI id
  idEmployee?: number   // numeric backend Id — required for create-trx
  name:        string
  role:        string
  avatar?:     string
}
