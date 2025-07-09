# Personal Website

A modern, responsive personal website built with React, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Modern Design**: Clean and professional portfolio layout
- **Responsive**: Optimized for all device sizes
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Vite**: Fast development and build tooling
- **Component-based**: Modular and reusable components

## 🛠️ Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Package Manager**: npm
- **Linting**: ESLint

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Card.tsx
│   ├── FilterBar.tsx
│   ├── Header.tsx
│   ├── MasonryGrid.tsx
│   ├── MetaTriplet.tsx
│   ├── ProjectHero.tsx
│   ├── StatsPanel.tsx
│   ├── Testimonial.tsx
│   └── VideoCarousel.tsx
├── pages/              # Page components
│   ├── PortfolioPage.tsx
│   └── ProjectDetailPage.tsx
├── styles/             # Style tokens and utilities
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── App.tsx             # Main application component
```

## 🚀 Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/personal-website.git
   cd personal-website
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🎨 Customization

### Styling
The project uses Tailwind CSS for styling. You can customize the design by:
- Modifying `tailwind.config.js` for theme customization
- Updating `src/styles/tokens.ts` for design tokens
- Editing component styles in their respective files

### Content
Update the content by modifying:
- Component props and data
- Static content in component files
- Data files in the `utils/` directory

## 📦 Deployment

This project can be deployed to various platforms:

- **Vercel**: Connect your GitHub repository for automatic deployments
- **Netlify**: Drag and drop the `dist` folder after building
- **GitHub Pages**: Use GitHub Actions for automatic deployment

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 👤 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/yourprofile)

---

Made with ❤️ using React, TypeScript, and Tailwind CSS 