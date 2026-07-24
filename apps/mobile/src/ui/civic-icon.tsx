import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

export type CivicIconName =
  | 'arrow-left'
  | 'bell'
  | 'chevron-right'
  | 'complaint'
  | 'community'
  | 'device'
  | 'filter'
  | 'home'
  | 'locate'
  | 'location'
  | 'lock'
  | 'message'
  | 'more'
  | 'office'
  | 'phone'
  | 'plus'
  | 'profile'
  | 'search'
  | 'shield'
  | 'sign-out'
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

  if (name === 'chevron-right') {
    return (
      <IconFrame>
        <View style={[styles.chevronRight, { borderColor: color }]} />
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

  if (name === 'community') {
    return (
      <IconFrame>
        <View style={[styles.personHead, { backgroundColor: color }]} />
        <View style={[styles.personBody, { backgroundColor: color }]} />
        <View style={[styles.personHeadSmall, { backgroundColor: color }]} />
        <View style={[styles.personBodySmall, { backgroundColor: color }]} />
      </IconFrame>
    );
  }

  if (name === 'device') {
    return (
      <IconFrame>
        <View style={[styles.device, { borderColor: color }]}>
          <View style={[styles.deviceButton, { backgroundColor: color }]} />
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

  if (name === 'home') {
    return (
      <IconFrame>
        <View style={[styles.homeRoof, { backgroundColor: color }]} />
        <View style={[styles.homeBody, { backgroundColor: color }]}>
          <View style={styles.homeDoor} />
        </View>
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

  if (name === 'lock' || name === 'shield') {
    return (
      <IconFrame>
        {name === 'lock' ? (
          <>
            <View style={[styles.lockShackle, { borderColor: color }]} />
            <View style={[styles.lockBody, { backgroundColor: color }]}>
              <View style={styles.lockKeyhole} />
            </View>
          </>
        ) : (
          <View style={[styles.shield, { borderColor: color }]}>
            <View style={[styles.shieldCheckShort, { backgroundColor: color }]} />
            <View style={[styles.shieldCheckLong, { backgroundColor: color }]} />
          </View>
        )}
      </IconFrame>
    );
  }

  if (name === 'message') {
    return (
      <IconFrame>
        <View style={[styles.message, { borderColor: color }]}>
          <View style={[styles.messageTail, { borderColor: color }]} />
        </View>
      </IconFrame>
    );
  }

  if (name === 'more') {
    return (
      <IconFrame>
        <View style={styles.moreRow}>
          {[0, 1, 2].map((dot) => (
            <View key={dot} style={[styles.moreDot, { backgroundColor: color }]} />
          ))}
        </View>
      </IconFrame>
    );
  }

  if (name === 'phone') {
    return (
      <IconFrame>
        <View style={[styles.phoneTop, { backgroundColor: color }]} />
        <View style={[styles.phoneStem, { borderColor: color }]} />
        <View style={[styles.phoneBottom, { backgroundColor: color }]} />
      </IconFrame>
    );
  }

  if (name === 'plus') {
    return (
      <IconFrame>
        <View style={[styles.plusHorizontal, { backgroundColor: color }]} />
        <View style={[styles.plusVertical, { backgroundColor: color }]} />
      </IconFrame>
    );
  }

  if (name === 'profile') {
    return (
      <IconFrame>
        <View style={[styles.profileHead, { backgroundColor: color }]} />
        <View style={[styles.profileBody, { backgroundColor: color }]} />
      </IconFrame>
    );
  }

  if (name === 'sign-out') {
    return (
      <IconFrame>
        <View style={[styles.signOutDoor, { borderColor: color }]} />
        <View style={[styles.signOutShaft, { backgroundColor: color }]} />
        <View style={[styles.signOutHead, { borderColor: color }]} />
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
  chevronRight: {
    borderRightWidth: 2.4,
    borderTopWidth: 2.4,
    height: 9,
    left: 7,
    position: 'absolute',
    top: 7,
    transform: [{ rotate: '45deg' }],
    width: 9,
  },
  device: {
    borderRadius: 4,
    borderWidth: 2,
    height: 22,
    left: 5,
    position: 'absolute',
    top: 1,
    width: 14,
  },
  deviceButton: { borderRadius: 2, bottom: 2, height: 2, left: 4, position: 'absolute', width: 3 },
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
  homeBody: {
    borderRadius: 2,
    bottom: 2,
    height: 12,
    left: 4,
    position: 'absolute',
    width: 16,
  },
  homeDoor: {
    backgroundColor: '#ffffff',
    bottom: 0,
    height: 7,
    left: 6,
    position: 'absolute',
    width: 4,
  },
  homeRoof: {
    height: 15,
    left: 5,
    position: 'absolute',
    top: 3,
    transform: [{ rotate: '45deg' }],
    width: 15,
  },
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
  lockBody: {
    borderRadius: 3,
    bottom: 2,
    height: 13,
    left: 4,
    position: 'absolute',
    width: 16,
  },
  lockKeyhole: {
    backgroundColor: '#ffffff',
    borderRadius: 2,
    height: 4,
    left: 7,
    position: 'absolute',
    top: 5,
    width: 2,
  },
  lockShackle: {
    borderBottomWidth: 0,
    borderRadius: 7,
    borderWidth: 2,
    height: 10,
    left: 7,
    position: 'absolute',
    top: 1,
    width: 10,
  },
  message: {
    borderRadius: 6,
    borderWidth: 2,
    height: 16,
    left: 3,
    position: 'absolute',
    top: 3,
    width: 18,
  },
  messageTail: {
    borderBottomWidth: 2,
    borderRightWidth: 2,
    bottom: -4,
    height: 7,
    left: 3,
    position: 'absolute',
    transform: [{ rotate: '35deg' }],
    width: 7,
  },
  moreDot: { borderRadius: 3, height: 5, width: 5 },
  moreRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    height: 24,
    justifyContent: 'center',
    width: 24,
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
  personBody: {
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    bottom: 1,
    height: 11,
    left: 1,
    position: 'absolute',
    width: 14,
  },
  personBodySmall: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    bottom: 1,
    height: 9,
    position: 'absolute',
    right: 0,
    width: 11,
  },
  personHead: { borderRadius: 8, height: 9, left: 3, position: 'absolute', top: 1, width: 9 },
  personHeadSmall: {
    borderRadius: 6,
    height: 7,
    position: 'absolute',
    right: 2,
    top: 4,
    width: 7,
  },
  phoneBottom: {
    borderRadius: 4,
    bottom: 2,
    height: 6,
    position: 'absolute',
    right: 3,
    transform: [{ rotate: '-38deg' }],
    width: 10,
  },
  phoneStem: {
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderRadius: 9,
    height: 17,
    left: 5,
    position: 'absolute',
    top: 3,
    transform: [{ rotate: '-15deg' }],
    width: 14,
  },
  phoneTop: {
    borderRadius: 4,
    height: 6,
    left: 1,
    position: 'absolute',
    top: 1,
    transform: [{ rotate: '-38deg' }],
    width: 10,
  },
  plusHorizontal: {
    borderRadius: 2,
    height: 4,
    left: 2,
    position: 'absolute',
    top: 10,
    width: 20,
  },
  plusVertical: {
    borderRadius: 2,
    height: 20,
    left: 10,
    position: 'absolute',
    top: 2,
    width: 4,
  },
  profileBody: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    bottom: 1,
    height: 10,
    left: 3,
    position: 'absolute',
    width: 18,
  },
  profileHead: {
    borderRadius: 6,
    height: 11,
    left: 6.5,
    position: 'absolute',
    top: 1,
    width: 11,
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
  shield: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderWidth: 2,
    height: 21,
    left: 4,
    position: 'absolute',
    top: 1,
    width: 16,
  },
  shieldCheckLong: {
    borderRadius: 1,
    height: 2,
    left: 8,
    position: 'absolute',
    top: 9,
    transform: [{ rotate: '-45deg' }],
    width: 7,
  },
  shieldCheckShort: {
    borderRadius: 1,
    height: 2,
    left: 4,
    position: 'absolute',
    top: 11,
    transform: [{ rotate: '45deg' }],
    width: 5,
  },
  signOutDoor: {
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    height: 20,
    left: 2,
    position: 'absolute',
    top: 2,
    width: 11,
  },
  signOutHead: {
    borderRightWidth: 2,
    borderTopWidth: 2,
    height: 7,
    position: 'absolute',
    right: 2,
    top: 8,
    transform: [{ rotate: '45deg' }],
    width: 7,
  },
  signOutShaft: {
    height: 2,
    position: 'absolute',
    right: 2,
    top: 11,
    width: 13,
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
