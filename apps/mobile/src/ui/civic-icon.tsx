import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

export type CivicIconName =
  | 'arrow-left'
  | 'bell'
  | 'complaint'
  | 'filter'
  | 'locate'
  | 'location'
  | 'office'
  | 'search'
  | 'status';

export const CivicIcon = ({ color, name }: Readonly<{ color: string; name: CivicIconName }>) => {
  if (name === 'arrow-left') {
    return (
      <IconFrame>
        <View style={[styles.arrowShaft, { backgroundColor: color }]} />
        <View style={[styles.arrowHead, { borderColor: color }]} />
      </IconFrame>
    );
  }

  if (name === 'bell') {
    return (
      <IconFrame>
        <View style={[styles.bellDome, { borderColor: color }]} />
        <View style={[styles.bellRim, { backgroundColor: color }]} />
        <View style={[styles.bellClapper, { backgroundColor: color }]} />
      </IconFrame>
    );
  }

  if (name === 'complaint') {
    return (
      <IconFrame>
        <View style={[styles.document, { borderColor: color }]}>
          <View style={[styles.documentLine, { backgroundColor: color }]} />
          <View style={[styles.documentLine, { backgroundColor: color }]} />
          <View style={[styles.documentLineShort, { backgroundColor: color }]} />
        </View>
      </IconFrame>
    );
  }

  if (name === 'filter') {
    return (
      <IconFrame>
        <View style={[styles.filterLine, styles.filterLineTop, { backgroundColor: color }]} />
        <View style={[styles.filterLine, styles.filterLineMiddle, { backgroundColor: color }]} />
        <View style={[styles.filterLine, styles.filterLineBottom, { backgroundColor: color }]} />
        <View style={[styles.filterKnob, styles.filterKnobTop, { backgroundColor: color }]} />
        <View style={[styles.filterKnob, styles.filterKnobMiddle, { backgroundColor: color }]} />
        <View style={[styles.filterKnob, styles.filterKnobBottom, { backgroundColor: color }]} />
      </IconFrame>
    );
  }

  if (name === 'locate') {
    return (
      <IconFrame>
        <View style={[styles.locateRing, { borderColor: color }]} />
        <View style={[styles.locateHorizontal, { backgroundColor: color }]} />
        <View style={[styles.locateVertical, { backgroundColor: color }]} />
        <View style={[styles.locateDot, { backgroundColor: color }]} />
      </IconFrame>
    );
  }

  if (name === 'location') {
    return (
      <IconFrame>
        <View style={[styles.locationPin, { backgroundColor: color }]}>
          <View style={styles.locationDot} />
        </View>
      </IconFrame>
    );
  }

  if (name === 'office') {
    return (
      <IconFrame>
        <View style={[styles.office, { borderColor: color }]}>
          <View style={styles.officeWindows}>
            {[0, 1, 2, 3].map((window) => (
              <View key={window} style={[styles.officeWindow, { backgroundColor: color }]} />
            ))}
          </View>
          <View style={[styles.officeDoor, { backgroundColor: color }]} />
        </View>
      </IconFrame>
    );
  }

  return (
    <IconFrame>
      <View style={[styles.searchRing, { borderColor: color }]} />
      <View style={[styles.searchHandle, { backgroundColor: color }]} />
      {name === 'status' ? <View style={[styles.statusDot, { backgroundColor: color }]} /> : null}
    </IconFrame>
  );
};

const IconFrame = ({ children }: Readonly<{ children: ReactNode }>) => (
  <View
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    style={styles.frame}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  arrowHead: {
    borderBottomWidth: 2.4,
    borderLeftWidth: 2.4,
    height: 9,
    left: 4,
    position: 'absolute',
    top: 7.5,
    transform: [{ rotate: '45deg' }],
    width: 9,
  },
  arrowShaft: { height: 2.4, left: 5, position: 'absolute', top: 10.8, width: 15 },
  bellClapper: { borderRadius: 3, bottom: 2, height: 4, left: 10, position: 'absolute', width: 4 },
  bellDome: {
    borderBottomWidth: 0,
    borderRadius: 9,
    borderWidth: 2,
    height: 14,
    left: 5,
    position: 'absolute',
    top: 3,
    width: 14,
  },
  bellRim: { borderRadius: 2, height: 2.5, left: 3, position: 'absolute', top: 16, width: 18 },
  document: {
    borderRadius: 3,
    borderWidth: 2,
    gap: 3,
    height: 20,
    justifyContent: 'center',
    left: 5,
    paddingHorizontal: 3,
    position: 'absolute',
    top: 2,
    width: 15,
  },
  documentLine: { borderRadius: 1, height: 2, width: 7 },
  documentLineShort: { borderRadius: 1, height: 2, width: 5 },
  filterKnob: { borderRadius: 3, height: 5, position: 'absolute', width: 5 },
  filterKnobBottom: { left: 6, top: 16 },
  filterKnobMiddle: { right: 6, top: 9.5 },
  filterKnobTop: { left: 8, top: 3 },
  filterLine: { borderRadius: 1, height: 2, left: 3, position: 'absolute', width: 18 },
  filterLineBottom: { top: 17.5 },
  filterLineMiddle: { top: 11 },
  filterLineTop: { top: 4.5 },
  frame: { height: 24, position: 'relative', width: 24 },
  locateDot: { borderRadius: 3, height: 6, left: 9, position: 'absolute', top: 9, width: 6 },
  locateHorizontal: { height: 2, left: 1, position: 'absolute', top: 11, width: 22 },
  locateRing: {
    borderRadius: 8,
    borderWidth: 2,
    height: 16,
    left: 4,
    position: 'absolute',
    top: 4,
    width: 16,
  },
  locateVertical: { height: 22, left: 11, position: 'absolute', top: 1, width: 2 },
  locationDot: {
    backgroundColor: '#ffffff',
    borderRadius: 3,
    height: 6,
    left: 4,
    position: 'absolute',
    top: 4,
    width: 6,
  },
  locationPin: {
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    height: 14,
    left: 5,
    position: 'absolute',
    top: 3,
    transform: [{ rotate: '45deg' }],
    width: 14,
  },
  office: {
    borderRadius: 2,
    borderWidth: 2,
    height: 20,
    left: 4,
    position: 'absolute',
    top: 2,
    width: 16,
  },
  officeDoor: { bottom: 0, height: 6, left: 5, position: 'absolute', width: 3 },
  officeWindow: { borderRadius: 1, height: 3, width: 3 },
  officeWindows: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    left: 3,
    position: 'absolute',
    top: 4,
    width: 10,
  },
  searchHandle: {
    borderRadius: 2,
    height: 3,
    left: 15,
    position: 'absolute',
    top: 16,
    transform: [{ rotate: '45deg' }],
    width: 8,
  },
  searchRing: {
    borderRadius: 8,
    borderWidth: 2,
    height: 15,
    left: 3,
    position: 'absolute',
    top: 3,
    width: 15,
  },
  statusDot: {
    borderColor: '#ffffff',
    borderRadius: 4,
    borderWidth: 1,
    height: 7,
    left: 2,
    position: 'absolute',
    top: 15,
    width: 7,
  },
});
