import type { ParsedSelector, NestedSelectorBody, ParsedSelectorPart } from './isomorphic/selectorParser'
import type { SelectorEngine, SelectorRoot } from './selectorEngine';
import type { CSSComplexSelectorList } from './isomorphic/cssParser';
import { allEngineNames, parseSelector as parseSelectorIso, stringifySelector } from './isomorphic/selectorParser'
import { isElementVisible } from './domUtils';
import { XPathEngine } from './xpathSelectorEngine'
import { ReactEngine } from './reactSelectorEngine'
import { VueEngine } from './vueSelectorEngine'
import { RoleEngine } from './roleSelectorEngine'
import { SelectorEvaluatorImpl } from './selectorEvaluator';
import { kLayoutSelectorNames, type LayoutSelectorName, layoutSelectorScore } from './layoutSelectorUtils';
import { generateSelector } from './selectorGenerator';


type ElementText = { full: string, immediate: string[] };
type TextMatcher = (text: ElementText) => boolean;
interface SelectorEngineV2 {
    queryAll(root: SelectorRoot, body: any): Element[];
  }

const booleanAttributes = new Set(['checked', 'selected', 'disabled', 'readonly', 'multiple']);
const autoClosingTags = new Set(['AREA', 'BASE', 'BR', 'COL', 'COMMAND', 'EMBED', 'HR', 'IMG', 'INPUT', 'KEYGEN', 'LINK', 'MENUITEM', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR']);


function oneLine(s: string): string {
    return s.replace(/\n/g, '↵').replace(/\t/g, '⇆');
  }

  export class Selector {
    private _engines: Map<string, SelectorEngineV2>;
    _evaluator: SelectorEvaluatorImpl

    constructor () {
        this._engines = new Map()
        this._evaluator = new SelectorEvaluatorImpl(new Map());

        this._engines.set('xpath', XPathEngine);
        this._engines.set('xpath:light', XPathEngine);
        this._engines.set('_react', ReactEngine);
        this._engines.set('_vue', VueEngine);
        this._engines.set('role', RoleEngine);
        this._engines.set('text', this.createTextEngine(true));
        this._engines.set('text:light', this.createTextEngine(false));
        this._engines.set('id', this.createAttributeEngine('id', true));
        this._engines.set('id:light', this.createAttributeEngine('id', false));
        this._engines.set('data-testid', this.createAttributeEngine('data-testid', true));
        this._engines.set('data-testid:light', this.createAttributeEngine('data-testid', false));
        this._engines.set('data-test-id', this.createAttributeEngine('data-test-id', true));
        this._engines.set('data-test-id:light', this.createAttributeEngine('data-test-id', false));
        this._engines.set('data-test', this.createAttributeEngine('data-test', true));
        this._engines.set('data-test:light', this.createAttributeEngine('data-test', false));
        this._engines.set('css', this.createCSSEngine());
        this._engines.set('nth', { queryAll: () => [] });
        this._engines.set('visible', this.createVisibleEngine());
        this._engines.set('control', this.createControlEngine());
        this._engines.set('has', this.createHasEngine());
    }

    generateSelector(targetElement: Element): string {
        return generateSelector(this, targetElement, true).selector;
    }

    createLaxTextMatcher(text: string): TextMatcher {
        text = text.trim().replace(/\s+/g, ' ').toLowerCase();
        return (elementText: ElementText) => {
          const s = elementText.full.trim().replace(/\s+/g, ' ').toLowerCase();
          return s.includes(text);
        };
    }

    createStacklessError(message: string): Error {
        // if (this._browserName === 'firefox') {
        //   const error = new Error('Error: ' + message);
        //   // Firefox cannot delete the stack, so assign to an empty string.
        //   error.stack = '';
        //   return error;
        // }
        const error = new Error(message);
        // Chromium/WebKit should delete the stack instead.
        delete error.stack;
        return error;
    }

    createStrictTextMatcher(text: string): TextMatcher {
        text = text.trim().replace(/\s+/g, ' ');
        return (elementText: ElementText) => {
          if (!text && !elementText.immediate.length)
            return true;
          return elementText.immediate.some(s => s.trim().replace(/\s+/g, ' ') === text);
        };
    }

    createRegexTextMatcher(source: string, flags?: string): TextMatcher {
        const re = new RegExp(source, flags);
        return (elementText: ElementText) => {
          return re.test(elementText.full);
        };
    }  

    createTextMatcher(selector: string): { matcher: TextMatcher, kind: 'regex' | 'strict' | 'lax' } {
        if (selector[0] === '/' && selector.lastIndexOf('/') > 0) {
          const lastSlash = selector.lastIndexOf('/');
          const matcher: TextMatcher = this.createRegexTextMatcher(selector.substring(1, lastSlash), selector.substring(lastSlash + 1));
          return { matcher, kind: 'regex' };
        }
        let strict = false;
        if (selector.length > 1 && selector[0] === '"' && selector[selector.length - 1] === '"') {
          selector = unescape(selector.substring(1, selector.length - 1));
          strict = true;
        }
        if (selector.length > 1 && selector[0] === "'" && selector[selector.length - 1] === "'") {
          selector = unescape(selector.substring(1, selector.length - 1));
          strict = true;
        }
        const matcher = strict ? this.createStrictTextMatcher(selector) : this.createLaxTextMatcher(selector);
        return { matcher, kind: strict ? 'strict' : 'lax' };
     }

    shouldSkipForTextMatching(element: Element | ShadowRoot) {
        return element.nodeName === 'SCRIPT' || element.nodeName === 'STYLE' || document.head && document.head.contains(element);
    }

    elementText(cache: Map<Element | ShadowRoot, ElementText>, root: Element | ShadowRoot): ElementText {
        let value = cache.get(root);
        if (value === undefined) {
          value = { full: '', immediate: [] };
          if (!this.shouldSkipForTextMatching(root)) {
            let currentImmediate = '';
            if ((root instanceof HTMLInputElement) && (root.type === 'submit' || root.type === 'button')) {
              value = { full: root.value, immediate: [root.value] };
            } else {
              for (let child = root.firstChild; child; child = child.nextSibling) {
                if (child.nodeType === Node.TEXT_NODE) {
                  value.full += child.nodeValue || '';
                  currentImmediate += child.nodeValue || '';
                } else {
                  if (currentImmediate)
                    value.immediate.push(currentImmediate);
                  currentImmediate = '';
                  if (child.nodeType === Node.ELEMENT_NODE)
                    value.full += this.elementText(cache, child as Element).full;
                }
              }
              if (currentImmediate)
                value.immediate.push(currentImmediate);
              if ((root as Element).shadowRoot)
                value.full += this.elementText(cache, (root as Element).shadowRoot!).full;
            }
          }
          cache.set(root, value);
        }
        return value;
      }

    elementMatchesText(cache: Map<Element | ShadowRoot, ElementText>, element: Element, matcher: TextMatcher): 'none' | 'self' | 'selfAndChildren' {
        if (this.shouldSkipForTextMatching(element))
          return 'none';
        if (!matcher(this.elementText(cache, element)))
          return 'none';
        for (let child = element.firstChild; child; child = child.nextSibling) {
          if (child.nodeType === Node.ELEMENT_NODE && matcher(this.elementText(cache, child as Element)))
            return 'selfAndChildren';
        }
        if (element.shadowRoot && matcher(this.elementText(cache, element.shadowRoot)))
          return 'selfAndChildren';
        return 'self';
      }

    createTextEngine(shadow: boolean): SelectorEngine {
        const queryList = (root: SelectorRoot, selector: string): Element[] => {
          const { matcher, kind } = this.createTextMatcher(selector);
          const result: Element[] = [];
          let lastDidNotMatchSelf: Element | null = null;
    
          const appendElement = (element: Element) => {
            // TODO: replace contains() with something shadow-dom-aware?
            if (kind === 'lax' && lastDidNotMatchSelf && lastDidNotMatchSelf.contains(element))
              return false;
            const matches = this.elementMatchesText(this._evaluator._cacheText, element, matcher);
            if (matches === 'none')
              lastDidNotMatchSelf = element;
            if (matches === 'self' || (matches === 'selfAndChildren' && kind === 'strict'))
              result.push(element);

            return
          };
    
          if (root.nodeType === Node.ELEMENT_NODE)
            appendElement(root as Element);
          const elements = this._evaluator._queryCSS({ scope: root as Document | Element, pierceShadow: shadow }, '*');
          for (const element of elements)
            appendElement(element);
          return result;
        };
    
        return {
          queryAll: (root: SelectorRoot, selector: string): Element[] => {
            return queryList(root, selector);
          }
        };
    }

    createAttributeEngine(attribute: string, shadow: boolean): SelectorEngine {
        const toCSS = (selector: string): CSSComplexSelectorList => {
          const css = `[${attribute}=${JSON.stringify(selector)}]`;
          return [{ simples: [{ selector: { css, functions: [] }, combinator: '' }] }];
        };
        return {
          queryAll: (root: SelectorRoot, selector: string): Element[] => {
            return this._evaluator.query({ scope: root as Document | Element, pierceShadow: shadow }, toCSS(selector));
          }
        };
      }

    createCSSEngine(): SelectorEngineV2 {
        const evaluator = this._evaluator;
        return {
          queryAll(root: SelectorRoot, body: any) {
            return evaluator.query({ scope: root as Document | Element, pierceShadow: true }, body);
          }
        };
      }

    createVisibleEngine(): SelectorEngineV2 {
        const queryAll = (root: SelectorRoot, body: string) => {
          if (root.nodeType !== 1 /* Node.ELEMENT_NODE */)
            return [];
          return isElementVisible(root as Element) === Boolean(body) ? [root as Element] : [];
        };
        return { queryAll };
    }  

    createControlEngine(): SelectorEngineV2 {
        return {
          queryAll(root: SelectorRoot, body: any) {
            if (body === 'enter-frame')
              return [];
            if (body === 'return-empty')
              return [];
            throw new Error(`Internal error, unknown control selector ${body}`);
          }
        };
    }

    _queryNth(elements: Set<Element>, part: ParsedSelectorPart): Set<Element> {
        const list = [...elements];
        let nth = +part.body;
        if (nth === -1)
          nth = list.length - 1;
        return new Set<Element>(list.slice(nth, nth + 1));
    }

    queryEngineAll(part: ParsedSelectorPart, root: SelectorRoot): Element[] {
        const result = this._engines.get(part.name)!.queryAll(root, part.body);
        for (const element of result) {
          if (!('nodeName' in element))
            throw this.createStacklessError(`Expected a Node but got ${Object.prototype.toString.call(element)}`);
        }
        return result;
      }

    queryLayoutSelector(elements: Set<Element>, part: ParsedSelectorPart, originalRoot: Node): Set<Element> {
        const name = part.name as LayoutSelectorName;
        const body = part.body as NestedSelectorBody;
        const result: { element: Element, score: number }[] = [];
        const inner = this.querySelectorAll(body.parsed, originalRoot);
        for (const element of elements) {
          const score = layoutSelectorScore(name, element, inner, body.distance);
          if (score !== undefined)
            result.push({ element, score });
        }
        result.sort((a, b) => a.score - b.score);
        return new Set<Element>(result.map(r => r.element));
      }

    querySelectorAll(selector: ParsedSelector, root: Node): Element[] {
        if (selector.capture !== undefined) {
          if (selector.parts.some(part => part.name === 'nth'))
            throw this.createStacklessError(`Can't query n-th element in a request with the capture.`);
          const withHas: ParsedSelector = { parts: selector.parts.slice(0, selector.capture + 1) };
          if (selector.capture < selector.parts.length - 1) {
            const parsed: ParsedSelector = { parts: selector.parts.slice(selector.capture + 1) };
            const has: ParsedSelectorPart = { name: 'has', body: { parsed }, source: stringifySelector(parsed) };
            withHas.parts.push(has);
          }
          return this.querySelectorAll(withHas, root);
        }
    
        if (!(root as any)['querySelectorAll'])
          throw this.createStacklessError('Node is not queryable.');
    
        if (selector.capture !== undefined) {
          // We should have handled the capture above.
          throw this.createStacklessError('Internal error: there should not be a capture in the selector.');
        }
    
        this._evaluator.begin();
        try {
          let roots = new Set<Element>([root as Element]);
          for (const part of selector.parts) {
            if (part.name === 'nth') {
              roots = this._queryNth(roots, part);
            } else if (kLayoutSelectorNames.includes(part.name as LayoutSelectorName)) {
              roots = this.queryLayoutSelector(roots, part, root);
            } else {
              const next = new Set<Element>();
              for (const root of roots) {
                const all = this.queryEngineAll(part, root);
                for (const one of all)
                  next.add(one);
              }
              roots = next;
            }
          }
          return [...roots];
        } finally {
            this._evaluator.end();
        }
     }

    previewNode(node: Node): string {
        if (node.nodeType === Node.TEXT_NODE)
          return oneLine(`#text=${node.nodeValue || ''}`);
        if (node.nodeType !== Node.ELEMENT_NODE)
          return oneLine(`<${node.nodeName.toLowerCase()} />`);
        const element = node as Element;
    
        const attrs:string[] = [];
        for (let i = 0; i < element.attributes.length; i++) {
          const { name, value } = element.attributes[i];
          if (name === 'style' || name.startsWith('__playwright'))
            continue;
          if (!value && booleanAttributes.has(name))
            attrs.push(` ${name}`);
          else
            attrs.push(` ${name}="${value}"`);
        }
        attrs.sort((a, b) => a.length - b.length);
        let attrText = attrs.join('');
        if (attrText.length > 50)
          attrText = attrText.substring(0, 49) + '\u2026';
        if (autoClosingTags.has(element.nodeName))
          return oneLine(`<${element.nodeName.toLowerCase()}${attrText}/>`);
    
        const children = element.childNodes;
        let onlyText = false;
        if (children.length <= 5) {
          onlyText = true;
          for (let i = 0; i < children.length; i++)
            onlyText = onlyText && children[i].nodeType === Node.TEXT_NODE;
        }
        let text = onlyText ? (element.textContent || '') : (children.length ? '\u2026' : '');
        if (text.length > 50)
          text = text.substring(0, 49) + '\u2026';
        return oneLine(`<${element.nodeName.toLowerCase()}${attrText}>${text}</${element.nodeName.toLowerCase()}>`);
    }

    strictModeViolationError(selector: ParsedSelector, matches: Element[]): Error {
        const infos = matches.slice(0, 10).map(m => ({
          preview: this.previewNode(m),
          selector: this.generateSelector(m),
        }));
        const lines = infos.map((info, i) => `\n    ${i + 1}) ${info.preview} aka playwright.$("${info.selector}")`);
        if (infos.length < matches.length)
          lines.push('\n    ...');
        return this.createStacklessError(`strict mode violation: "${stringifySelector(selector)}" resolved to ${matches.length} elements:${lines.join('')}\n`);
    }

    querySelector(selector: ParsedSelector, root: Node, strict: boolean): Element | undefined {
        const result = this.querySelectorAll(selector, root);
        if (strict && result.length > 1)
          throw this.strictModeViolationError(selector, result);
        return result[0];
      }

     createHasEngine(): SelectorEngineV2 {
        const queryAll = (root: SelectorRoot, body: NestedSelectorBody) => {
          if (root.nodeType !== 1 /* Node.ELEMENT_NODE */)
            return [];
          const has = !!this.querySelector(body.parsed, root, false);
          return has ? [root as Element] : [];
        };
        return { queryAll };
      }

    parseSelector(selector: string): ParsedSelector {
        const result = parseSelectorIso(selector);
        for (const name of allEngineNames(result)) {
          if (!this._engines.has(name))
            throw this.createStacklessError(`Unknown engine "${name}" while parsing selector ${selector}`);
        }
        return result;
    }

    $$(selector: string, root: Node): Element[] {
      if (typeof selector !== 'string')
        throw new Error(`Usage: playwright.$$('Playwright >> selector').`);
      const parsed = this.parseSelector(selector);
      return this.querySelectorAll(parsed, root);
    }
}