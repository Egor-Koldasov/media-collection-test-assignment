import tseslint from "typescript-eslint";

const eslintConfig = tseslint.config(
  {
    ignores: [".next/**", "out/**", "dist/**", "coverage/**", "next-env.d.ts"]
  },
  ...tseslint.configs.recommended
);

export default eslintConfig;
