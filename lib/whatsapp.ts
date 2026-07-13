// Pre-written WhatsApp messages the team can send in one tap. The client's name
// is filled in; the rep can still edit the text in WhatsApp before sending.

export interface WaTemplate {
  id: string;
  label: string;
  build: (ctx: { name: string }) => string;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

export const WA_TEMPLATES: WaTemplate[] = [
  {
    id: "quote",
    label: "Quote sent",
    build: ({ name }) =>
      `Hi ${firstName(name)}, this is Servian Contracting. We've just sent you the quotation for your project — let us know if you have any questions.`,
  },
  {
    id: "reminder",
    label: "Appointment reminder",
    build: ({ name }) =>
      `Hi ${firstName(name)}, a quick reminder of our upcoming appointment. See you soon — Servian Contracting.`,
  },
  {
    id: "advance",
    label: "Request 50% advance",
    build: ({ name }) =>
      `Hi ${firstName(name)}, to book the start of your works we kindly ask for the 50% advance payment. I'll share our bank details — just let me know once it's done. Thank you!`,
  },
  {
    id: "followup",
    label: "Follow up",
    build: ({ name }) =>
      `Hi ${firstName(name)}, just following up on your project. Would you like to move forward?`,
  },
  {
    id: "thanks",
    label: "Thank you",
    build: ({ name }) =>
      `Hi ${firstName(name)}, thank you for trusting Servian Contracting with your project. It's been a pleasure — we're here whenever you need us.`,
  },
  {
    id: "reengage",
    label: "Re-engage (dormant)",
    build: ({ name }) =>
      `Hi ${firstName(name)}, this is Servian Contracting. It's been a while — is there anything we can help you with on your property?`,
  },
];

export function waLink(phone: string, text?: string) {
  const num = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
