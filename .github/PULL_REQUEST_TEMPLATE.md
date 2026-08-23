## What this changes

<!-- One or two sentences. Link the issue if there is one. -->

## Checklist

- [ ] Tests pass, including unit tests against hand-checked values for any new or changed stat function
- [ ] No framing violations: nothing states or implies individual life expectancy, years remaining, or a countdown (SPEC.md §2, §9)
- [ ] Country alive-vs-births, if touched, is still labeled net of migration — never presented as survival/attrition (SPEC.md §4.2)
- [ ] UN WPP attribution remains intact in the UI
- [ ] First-paint budget respected: nothing new on the critical path without a measurement
- [ ] Data or methodology changes are reflected in `data/DATA.md` and `site/public/methods.html`
