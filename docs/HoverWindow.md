# HoverWindow Component

A flexible component for rendering content on top of the existing UI without clearing the page. Uses absolute positioning to create modal-like overlays while keeping the background visible.

## Features

- **Absolute Positioning**: Renders content on top of existing UI without disrupting layout
- **Flexible Sizing**: Support for fixed sizes (numbers) or percentage-based sizing (strings like "80%")
- **Multiple Positioning Modes**: Center, or custom coordinates (top/left/bottom/right)
- **Optional Background Dimming**: Dim the background content to focus attention on the window
- **Customizable Appearance**: Border styles, colors, padding, and background colors
- **Title Support**: Optional title bar

## API

### Props

```typescript
interface HoverWindowProps {
  children: ReactNode;                    // Content to render in the window
  width?: number | string;                 // Width in columns or percentage (default: 60)
  height?: number | string;                // Height in rows or percentage (default: auto)
  position?: 'center' | {                  // Position mode (default: 'center')
    top?: number;
    left?: number;
    bottom?: number;
    right?: number;
  };
  showBorder?: boolean;                    // Show border (default: true)
  borderColor?: string;                    // Border color (default: 'cyan')
  borderStyle?: 'single' | 'double' |      // Border style (default: 'round')
                'round' | 'bold' |
                'singleDouble' | 'doubleSingle' |
                'classic';
  title?: string;                          // Optional title
  backgroundColor?: string;                // Background color
  padding?: number;                        // Inner padding (default: 1)
  dimBackground?: boolean;                 // Dim background content (default: false)
}
```

## Usage Examples

### Basic Centered Modal

```tsx
import { HoverWindow } from './components/HoverWindow';

<HoverWindow
  title="Confirmation"
  width={50}
  height={10}
  position="center"
>
  <Text>Are you sure you want to continue?</Text>
  <Box marginTop={1}>
    <Text color="green">[Y]es</Text>
    <Text> / </Text>
    <Text color="red">[N]o</Text>
  </Box>
</HoverWindow>
```

### Notification at Top-Right

```tsx
<HoverWindow
  width={40}
  position={{ top: 2, right: 2 }}
  borderColor="green"
  title="Success"
>
  <Text color="green">✓ Operation completed successfully!</Text>
</HoverWindow>
```

### Large Content Window with Percentage Sizing

```tsx
<HoverWindow
  width="80%"
  height="60%"
  position="center"
  title="Details"
  dimBackground={true}
>
  <Box flexDirection="column">
    <Text>This window takes up 80% of the terminal width</Text>
    <Text>and 60% of the terminal height.</Text>
  </Box>
</HoverWindow>
```

### Bottom Status Bar

```tsx
<HoverWindow
  position={{ bottom: 0, left: 0 }}
  width="100%"
  borderStyle="single"
  borderColor="blue"
  padding={0}
>
  <Text>Status: Processing... 45%</Text>
</HoverWindow>
```

### Borderless Window with Background Color

```tsx
<HoverWindow
  width={40}
  position={{ top: 5, left: 5 }}
  showBorder={false}
  backgroundColor="blue"
  padding={2}
>
  <Text color="white" bold>Important Notice</Text>
  <Text color="white">This has no border but has a blue background.</Text>
</HoverWindow>
```

## Integration with Layout Component

The `Layout` component has been updated to support rendering hover windows:

```tsx
import { Layout } from './components/Layout';
import { HoverWindow } from './components/HoverWindow';

const App = () => {
  const [showModal, setShowModal] = useState(false);

  const hoverWindows = showModal ? (
    <HoverWindow title="Modal" position="center" width={60}>
      <Text>This is rendered on top of the main content!</Text>
    </HoverWindow>
  ) : undefined;

  return (
    <Layout
      activeCount={activeCount}
      waitingCount={waitingCount}
      helpContent={<Text>Help text here</Text>}
      hoverWindows={hoverWindows}
    >
      {/* Main content here */}
    </Layout>
  );
};
```

## Best Practices

1. **Use Percentage Sizing for Responsiveness**: When possible, use percentage-based sizing (e.g., `"80%"`) to ensure the window adapts to different terminal sizes.

2. **Dim Background for Modals**: Enable `dimBackground={true}` for important modals that require user attention.

3. **Choose Appropriate Positioning**:
   - `center`: For modals and dialogs
   - `{ top, right }`: For notifications
   - `{ bottom, left }`: For status bars
   - Custom coordinates: For context-specific overlays

4. **Avoid Overuse**: Too many hover windows can clutter the UI. Use sparingly for important information.

5. **Handle Input Appropriately**: Remember to use `useInput()` hook in your parent component to handle keyboard interactions with hover windows.

## Position Reference

```
Terminal Layout:
┌─────────────────────────────────────┐
│ { top: 0, left: 0 }                 │ { top: 0, right: 0 }
│                                     │
│                                     │
│            position="center"        │
│                                     │
│                                     │
│ { bottom: 0, left: 0 }              │ { bottom: 0, right: 0 }
└─────────────────────────────────────┘
```

## Technical Notes

- The component uses Ink's `position="absolute"` prop to overlay content
- Terminal dimensions are obtained from `useStdout()` hook
- Background dimming creates a visual overlay by rendering dim spaces
- Multiple hover windows can be rendered simultaneously by wrapping them in a fragment

## Example: Complete Implementation

See `src/components/HoverWindow.example.tsx` for a comprehensive example demonstrating all features.
