/**
 * Sheet Building Blocks
 *
 * Composable components for building consistent sheets.
 * Use with AnimatedSheet as the container.
 *
 * @example
 * import { AnimatedSheet } from "@/components/common/AnimatedSheet"
 * import {
 *   AmountHero,
 *   FormCard,
 *   FormDivider,
 *   FormFieldButton,
 *   FormTextInput,
 *   CollapsibleSection,
 *   SheetActions
 * } from "@/components/common/sheet"
 *
 * <AnimatedSheet isOpen={isOpen} onClose={onClose}>
 *   <AmountHero amount={amount} onTap={openNumpad} />
 *   <div className="flex-1 overflow-y-auto px-4">
 *     <FormCard>
 *       <FormTextInput label="Merchant" ... />
 *       <FormDivider />
 *       <FormFieldButton icon="☕" label="Category" ... />
 *     </FormCard>
 *     <CollapsibleSection title="More options">
 *       ...
 *     </CollapsibleSection>
 *   </div>
 *   <SheetActions onCancel={close} onSubmit={save} ... />
 * </AnimatedSheet>
 */

export { AmountHero } from "./AmountHero"
export { FormCard, FormDivider } from "./FormCard"
export { FormFieldButton } from "./FormFieldButton"
export { FormTextInput, FormDateInput, FormTextArea } from "./FormTextInput"
export { CollapsibleSection } from "./CollapsibleSection"
export { SheetActions } from "./SheetActions"
export { QuickAmountButtons } from "./QuickAmountButtons"
