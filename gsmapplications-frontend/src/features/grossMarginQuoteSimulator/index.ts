// Public API for the Quote Simulator feature -- the ONLY path external code
// should import through.
//
// ./model/quote-scenario-export is deliberately not re-exported here: its
// one consumer lives inside this same feature and imports it directly.
export { QuoteSimulatorTab } from "./ui/QuoteSimulatorTab";
