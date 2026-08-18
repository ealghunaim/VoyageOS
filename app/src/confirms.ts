// Asking before replacing generated content.
//
// There were three of these and they disagreed on all three axes. The packing
// list said "Regenerate list?" with the button "Regenerate"; the guide said
// "Rewrite guide?" with "Rewrite"; and Redo picks — which costs exactly the
// same model call — asked nothing at all and just went. So the same decision
// was named two ways and, in one place, not offered.
//
// WHY THE MONEY LINE WENT
//
// Both dialogs said "calls the model again (a few cents)". That is our cost,
// not the traveller's — they are on a subscription and a rewrite does not bill
// them anything. Telling someone a free action costs "a few cents" invites
// them not to use a feature they have already paid for, to save money that was
// never theirs to save. What they actually risk is the thing on screen, so
// that is what the dialog now says.
import { Alert } from 'react-native';

/** Confirm replacing something generated. `what` is a lowercase noun: the
 *  dialog reads "Rewrite guide?" / "Rewrite picks?" / "Rewrite list?". */
export function confirmRewrite(what: string, onConfirm: () => void): void {
  Alert.alert(
    `Rewrite ${what}?`,
    'Your current version will be replaced.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Rewrite', onPress: onConfirm },
    ],
  );
}

/** Confirm destroying something the traveller made.
 *
 *  Six of these were written by hand and agreed on nothing: titles ranged
 *  over "Remove", "Delete document?" and "Delete this trip?", and the
 *  confirm button was sometimes the verb and sometimes the noun. A dialog is
 *  the last thing between a person and losing work, so the one thing it must
 *  never be is unfamiliar.
 *
 *  `subject` is what is being destroyed, shown as the body. iOS renders the
 *  destructive style in red — that is the system's own affordance for
 *  irreversibility and is the deliberate exception to the neutral-grey rule,
 *  which governs buttons on our own surfaces.
 */
export function confirmDelete(
  what: string, subject: string, onConfirm: () => void,
  { verb = 'Delete' }: { verb?: string } = {},
): void {
  Alert.alert(`${verb} ${what}?`, subject, [
    { text: 'Cancel', style: 'cancel' },
    { text: verb, style: 'destructive', onPress: onConfirm },
  ]);
}
