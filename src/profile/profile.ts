import type { Deck } from "../srs/leitner";
import type { Stats } from "../stats/stats";

export type Profile = { deck: Deck; stats: Stats };

export const emptyProfile = (): Profile => ({ deck: {}, stats: {} });
