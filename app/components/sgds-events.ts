/** Readers for the SGDS components' change events: the event's target is the component itself. */
export const valueOf = (e: Event) => (e.target as HTMLInputElement).value;
export const checkedOf = (e: Event) => (e.target as HTMLInputElement).checked;
export const filesOf = (e: Event) => (e.target as unknown as { files?: File[] }).files ?? [];
