import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, shadows } from './theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type TextVariant =
  | 'display'
  | 'hero'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodySm'
  | 'caption'
  | 'label'
  | 'eyebrow'
  | 'button';

const textVariants = StyleSheet.create({
  display: {
    fontFamily: fonts.black,
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.8,
    color: colors.ink,
  },
  hero: {
    fontFamily: fonts.black,
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.6,
    color: colors.ink,
  },
  h1: {
    fontFamily: fonts.bold,
    fontSize: 27,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: colors.ink,
  },
  h2: {
    fontFamily: fonts.bold,
    fontSize: 21,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: colors.ink,
  },
  h3: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.2,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 23,
    color: colors.inkSoft,
  },
  bodySm: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 21,
    color: colors.inkSoft,
  },
  caption: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
    color: colors.inkSoft,
  },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  button: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
});

type AppTextProps = TextProps & {
  variant?: TextVariant;
  style?: StyleProp<TextStyle>;
};

export function AppText({ variant = 'body', style, children, ...rest }: AppTextProps) {
  return (
    <Text {...rest} style={[textVariants[variant], style]}>
      {children}
    </Text>
  );
}

type ButtonVariant = 'primary' | 'light' | 'secondary' | 'ghost';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IoniconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const textColor =
    variant === 'primary'
      ? colors.white
      : variant === 'light'
        ? colors.forest
        : variant === 'secondary'
          ? colors.ink
          : colors.forest;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'light' && styles.buttonLight,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        isDisabled && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          <AppText variant="button" style={{ color: textColor }}>
            {label}
          </AppText>
          {icon ? <Ionicons name={icon} size={18} color={textColor} style={styles.buttonIcon} /> : null}
        </>
      )}
    </TouchableOpacity>
  );
}

type ChipProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: IoniconName;
  style?: StyleProp<ViewStyle>;
};

export function Chip({ label, active = false, onPress, icon, style }: ChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive, style]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={active ? colors.white : colors.inkSoft}
          style={styles.chipIcon}
        />
      ) : null}
      <AppText
        variant="label"
        style={[styles.chipText, active && styles.chipTextActive]}
      >
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
};

export function Card({ children, style, padded = true }: CardProps) {
  return <View style={[styles.card, padded && styles.cardPadded, style]}>{children}</View>;
}

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  meta?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function SectionHeader({ eyebrow, title, meta, action, style }: SectionHeaderProps) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={styles.sectionHeaderText}>
        {eyebrow ? <AppText variant="eyebrow" style={styles.sectionEyebrow}>{eyebrow}</AppText> : null}
        <AppText variant="h2">{title}</AppText>
      </View>
      {action ?? (meta ? <AppText variant="caption">{meta}</AppText> : null)}
    </View>
  );
}

type FieldProps = {
  label: string;
  children: React.ReactNode;
  hint?: string;
  style?: StyleProp<ViewStyle>;
};

export function Field({ label, children, hint, style }: FieldProps) {
  return (
    <View style={[styles.field, style]}>
      <AppText variant="label" style={styles.fieldLabel}>{label}</AppText>
      {children}
      {hint ? <AppText variant="caption" style={styles.fieldHint}>{hint}</AppText> : null}
    </View>
  );
}

type MetaItemProps = {
  icon: IoniconName;
  label: string;
  light?: boolean;
};

export function MetaItem({ icon, label, light = false }: MetaItemProps) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={14} color={light ? 'rgba(255,255,255,0.82)' : colors.muted} />
      <AppText
        variant="caption"
        style={[styles.metaItemText, light && styles.metaItemTextLight]}
      >
        {label}
      </AppText>
    </View>
  );
}

type IconBadgeProps = {
  name: IoniconName;
  tone?: 'forest' | 'teal' | 'clay' | 'sand';
  size?: number;
};

export function IconBadge({ name, tone = 'forest', size = 42 }: IconBadgeProps) {
  const palette = {
    forest: { bg: colors.forest, fg: colors.white },
    teal: { bg: colors.tealSoft, fg: colors.teal },
    clay: { bg: colors.claySoft, fg: colors.clay },
    sand: { bg: colors.surfaceMuted, fg: colors.forest },
  }[tone];

  return (
    <View
      style={[
        styles.iconBadge,
        { width: size, height: size, borderRadius: size / 3, backgroundColor: palette.bg },
      ]}
    >
      <Ionicons name={name} size={size * 0.46} color={palette.fg} />
    </View>
  );
}

type ProgressBarProps = {
  value: number;
  color?: string;
  trackColor?: string;
};

export function ProgressBar({ value, color = colors.forest, trackColor = colors.surfaceMuted }: ProgressBarProps) {
  const width = `${Math.max(0, Math.min(100, value))}%` as const;
  return (
    <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
      <View style={[styles.progressFill, { width, backgroundColor: color }]} />
    </View>
  );
}

type EmptyStateProps = {
  icon: IoniconName;
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, text, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={26} color={colors.forest} />
      </View>
      <AppText variant="h3" style={styles.emptyTitle}>{title}</AppText>
      <AppText variant="bodySm" style={styles.emptyText}>{text}</AppText>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" style={styles.emptyButton} />
      ) : null}
    </View>
  );
}

type NavItem = {
  key: string;
  label: string;
  icon: IoniconName;
  activeIcon: IoniconName;
};

const navItems: Array<{ key: TabKeyUnion; label: string; icon: IoniconName; activeIcon: IoniconName }> = [
  { key: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { key: 'trips', label: 'My Trips', icon: 'briefcase-outline', activeIcon: 'briefcase' },
  { key: 'explore', label: 'Explore', icon: 'compass-outline', activeIcon: 'compass' },
  { key: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

const TabKeys = ['home', 'trips', 'explore', 'profile'] as const;
export type TabKeyUnion = (typeof TabKeys)[number];

type BottomNavProps = {
  active: TabKeyUnion;
  onChange: (key: TabKeyUnion) => void;
};

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <View style={styles.navWrap} pointerEvents="box-none">
      <View style={styles.navBar}>
        {navItems.map(item => {
          const isActive = item.key === active;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.label}
              style={styles.navItem}
              onPress={() => onChange(item.key)}
            >
              <View style={[styles.navIconWrap, isActive && styles.navIconWrapActive]}>
                <Ionicons
                  name={isActive ? item.activeIcon : item.icon}
                  size={19}
                  color={isActive ? colors.white : colors.muted}
                />
              </View>
              <AppText
                variant="caption"
                style={[styles.navLabel, isActive && styles.navLabelActive]}
              >
                {item.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: radius.md,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.forest,
    ...shadows.soft,
  },
  buttonLight: {
    backgroundColor: colors.white,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    minHeight: 44,
    paddingHorizontal: 4,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  chipIcon: {
    marginRight: 5,
  },
  chipText: {
    color: colors.inkSoft,
    fontSize: 12.5,
  },
  chipTextActive: {
    color: colors.white,
    fontFamily: fonts.semibold,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.soft,
  },
  cardPadded: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  sectionHeaderText: {
    flexShrink: 1,
  },
  sectionEyebrow: {
    marginBottom: 6,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 8,
  },
  fieldHint: {
    marginTop: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaItemText: {
    fontSize: 11.5,
  },
  metaItemTextLight: {
    color: 'rgba(255,255,255,0.82)',
  },
  iconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 18,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.sageSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyButton: {
    marginTop: 18,
    paddingHorizontal: 22,
  },
  navWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  navBar: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 8,
    paddingHorizontal: 8,
    ...shadows.nav,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  navIconWrap: {
    width: 40,
    height: 34,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconWrapActive: {
    backgroundColor: colors.forest,
  },
  navLabel: {
    fontSize: 10.5,
    lineHeight: 14,
    color: colors.muted,
  },
  navLabelActive: {
    color: colors.forest,
    fontFamily: fonts.semibold,
  },
});
