# MCP Desktop Frontend

Modern TypeScript + Next.js App Router frontend for the MCP Desktop Application.

## 📁 Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx          # Main page
│   └── globals.css       # Global styles with CSS variables
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── input.tsx
│   ├── host-list.tsx     # Host management component
│   └── tool-tester.tsx   # Tool testing component
├── hooks/                # Custom React hooks
│   └── use-hosts.ts      # Host management hook
├── lib/                  # Utility functions
│   ├── types.ts          # TypeScript type definitions
│   └── utils.ts          # Utility functions (cn, getGatewayUrl)
├── next.config.mjs       # Next.js configuration
├── tailwind.config.ts    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── postcss.config.mjs    # PostCSS configuration
```

## 🚀 Features

- **TypeScript**: Full type safety with strict mode
- **Next.js App Router**: Modern React framework with App Router
- **Tailwind CSS**: Utility-first CSS framework with design system
- **CSS Variables**: Customizable color scheme with light/dark mode support
- **Lucide React**: Beautiful, consistent icons
- **Modern UI Components**: Reusable components built with Tailwind
- **Custom Hooks**: Reusable logic for data fetching
- **ESLint**: Code quality and consistency

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build
```

## 🎨 Design System

The frontend uses a consistent design system with CSS variables:

- **Colors**: Primary, secondary, muted, destructive, etc.
- **Typography**: Consistent font sizes and spacing
- **Components**: Reusable UI components with variants
- **Icons**: Lucide React icons throughout

## 🔧 Configuration

- **Path Aliases**: `@/` for root imports
- **Asset Prefix**: `./` for Electron compatibility
- **Static Export**: Generates static files for Electron
- **TypeScript**: Strict mode with comprehensive type checking

## 📱 Components

### UI Components
- `Button`: Variants (default, destructive, outline, etc.)
- `Card`: Content containers with header, content, footer
- `Badge`: Status indicators and labels
- `Input`: Form inputs with consistent styling

### Business Components
- `HostList`: Displays and manages MCP hosts
- `ToolTester`: Interface for testing MCP tools

### Hooks
- `useHosts`: Manages host data fetching and state

## 🎯 Electron Integration

- **Static Export**: Built files work with `file://` protocol
- **Path Handling**: Relative paths for assets
- **Gateway URL**: Automatic detection of Electron environment
- **Window API**: Integration with Electron's main process

## 🔄 Migration from Pages Router

This frontend was migrated from Next.js Pages Router to App Router:

- ✅ Converted from JavaScript to TypeScript
- ✅ Migrated to App Router structure
- ✅ Added modern UI components
- ✅ Implemented design system
- ✅ Added comprehensive type definitions
- ✅ Configured path aliases and build optimization

## 📦 Dependencies

### Production
- `next`: React framework
- `react` & `react-dom`: React library
- `axios`: HTTP client
- `lucide-react`: Icons
- `clsx` & `tailwind-merge`: Utility functions

### Development
- `typescript`: Type checking
- `tailwindcss`: CSS framework
- `eslint`: Code linting
- `@types/*`: Type definitions