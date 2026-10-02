import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function FAQ() {
  const faqs = [
    { q: "How do I add an expense?", a: "Tap the + button on the Home or Expenses screen, fill out the amount and details, and tap Save." },
    { q: "How do I edit or delete an expense?", a: "Go to the Expenses tab, tap on any expense in the list, and use the Edit or Delete options." },
    { q: "How does Monthly Income work?", a: "You can set your monthly income in the Budget tab. This helps calculate your remaining balance for the month." },
    { q: "How is Remaining calculated?", a: "Remaining = Monthly Income - Total Expenses for the current month." },
    { q: "How does Family Budget work?", a: "You can create or join a Family Budget from the Home screen. Everyone in the family shares the same expenses list." },
    { q: "How do I enable notifications?", a: "Go to Settings > Notifications to customize your daily reminders and budget alerts." },
    { q: "How do I enable App Lock?", a: "Go to Settings > Privacy & Security to set up a PIN or Biometric lock for the app." },
    { q: "How do I change my profile?", a: "Tap on your Profile on the home screen or Settings > Account to update your name and photo." },
    { q: "How do I delete my account?", a: "Go to Settings > Account > Delete Account. Note that this action is permanent." }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-card rounded-[24px] border border-border shadow-sm overflow-hidden">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-border px-5">
              <AccordionTrigger className="text-[15px] font-semibold text-foreground hover:no-underline py-4 text-left">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-[14px] text-muted-foreground leading-relaxed pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
