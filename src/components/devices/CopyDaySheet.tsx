import { useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';

import { DAY_LONG } from '@/lib/days';
import type { Day } from '@/lib/types';

import { DayPicker } from '../pickers';
import { colors, spacing } from '../theme';
import { Button, Muted, Sheet } from '../ui';

type Props = {
  visible: boolean;
  from: Day | null;
  eventCount: number;
  onCopy: (targets: Day[], replace: boolean) => void;
  onClose: () => void;
};

export function CopyDaySheet(props: Props) {
  // Mounting the sheet only while open gives it fresh state each time.
  return props.visible && props.from ? <CopyDay {...props} from={props.from} /> : null;
}

function CopyDay({ from, eventCount, onCopy, onClose }: Props & { from: Day }) {
  const [targets, setTargets] = useState<Day[]>([]);
  const [replace, setReplace] = useState(true);

  const copy = () => {
    if (targets.length === 0) {
      Alert.alert('Pick days', 'Choose the days to copy to.');
      return;
    }
    onCopy(targets, replace);
  };

  return (
    <Sheet
      visible
      title={`Copy ${DAY_LONG[from]} to…`}
      onClose={onClose}
      footer={<Button big title={`Copy to ${targets.length || ''} day${targets.length === 1 ? '' : 's'}`} onPress={copy} />}>
      <Muted>
        {eventCount === 0
          ? `${DAY_LONG[from]} has no events, so copying with “Replace” clears the chosen days.`
          : `${eventCount} event${eventCount === 1 ? '' : 's'} on ${DAY_LONG[from]}.`}
      </Muted>
      <DayPicker label="Copy to" value={targets} onChange={setTargets} exclude={from} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Switch value={replace} onValueChange={setReplace} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, color: colors.text, fontWeight: '600' }}>Replace their events</Text>
          <Muted>{replace ? 'The chosen days end up the same as this day.' : 'Keep their events and add these.'}</Muted>
        </View>
      </View>
    </Sheet>
  );
}
