'use client'

import { useEffect } from 'react'

const HELPER = 'http://localhost:8400'

export default function LivePicker() {
  useEffect(() => {
    let picking = false
    let selectedEl: Element | null = null
    let activeChip: string | null = null

    const bar = document.createElement('div')
    bar.id = '__il_bar'
    bar.innerHTML = [
      '<style>',
      '#__il_bar{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;direction:rtl;font-family:system-ui,sans-serif}',
      '#__il_bar .b{display:flex;align-items:center;gap:8px;background:#1a1a1a;color:#fff;padding:8px 16px;border-radius:999px;box-shadow:0 4px 24px rgba(0,0,0,0.3);font-size:14px}',
      '#__il_bar button{background:#4d938b;color:#fff;border:0;padding:4px 14px;border-radius:999px;cursor:pointer;font-size:13px}',
      '#__il_bar button.on{background:#555}',
      '#__il_bar input{background:#333;color:#fff;border:1px solid #555;border-radius:6px;padding:4px 10px;font-size:13px;width:180px;direction:rtl}',
      '#__il_bar input::placeholder{color:#888}',
      '#__il_bar .c{background:#333;color:#ccc;border:1px solid #555;border-radius:999px;padding:2px 10px;cursor:pointer;font-size:12px}',
      '#__il_bar .c.on{background:#4d938b;color:#fff;border-color:#4d938b}',
      '.__il_o{position:absolute;pointer-events:none;border:2px solid #4d938b;border-radius:4px;z-index:2147483646;transition:all 0.15s}',
      '</style>',
      '<div class="b">',
      '<button id="il_p">Pick</button>',
      '<input id="il_i" placeholder="\u0645\u0627 \u0630\u0627 \u062a\u0631\u064a\u062f\u061f" />',
      '<span class="c" data-a="bolder">bolder</span>',
      '<span class="c" data-a="quieter">quieter</span>',
      '<span class="c" data-a="polish">polish</span>',
      '<span class="c" data-a="delight">delight</span>',
      '<button id="il_g">Go</button>',
      '</div>',
    ].join('')
    document.body.appendChild(bar)

    const pickBtn = document.getElementById('il_p')!
    const input = document.getElementById('il_i') as HTMLInputElement
    const chips = bar.querySelectorAll<HTMLElement>('.c')
    const goBtn = document.getElementById('il_g')!

    const removeOutline = () => {
      document.querySelectorAll('.__il_o').forEach((el) => el.remove())
    }

    pickBtn.onclick = () => {
      picking = !picking
      pickBtn.className = picking ? 'on' : ''
      pickBtn.textContent = picking ? '\u0627\u062e\u062a\u0631...' : 'Pick'
      if (!picking) removeOutline()
    }

    chips.forEach((c) => {
      c.onclick = () => {
        chips.forEach((x) => (x.className = 'c'))
        c.className = 'c on'
        activeChip = c.getAttribute('data-a')
        input.placeholder = activeChip!
      }
    })

    document.addEventListener('click', (e) => {
      if (!picking) return
      if (bar.contains(e.target as Node)) return
      e.preventDefault()
      e.stopPropagation()
      selectedEl = e.target as Element

      removeOutline()
      const r = selectedEl.getBoundingClientRect()
      const o = document.createElement('div')
      o.className = '__il_o'
      o.style.top = r.top + 'px'
      o.style.left = r.left + 'px'
      o.style.width = r.width + 'px'
      o.style.height = r.height + 'px'
      document.body.appendChild(o)

      picking = false
      pickBtn.className = ''
      pickBtn.textContent = 'Pick'
    })

    const getSelector = (el: Element): string => {
      if (el.id) return '#' + el.id
      const path: string[] = []
      let current: Element | null = el
      while (current && current !== document.body && current !== document.documentElement) {
        let s = current.tagName.toLowerCase()
        if (current.id) { path.unshift('#' + current.id); break }
        if (current.className && typeof current.className === 'string') {
          const cls = Array.from(current.classList).slice(0, 2).join('.')
          if (cls) s += '.' + cls
        }
        path.unshift(s)
        current = current.parentElement
      }
      return path.join(' > ')
    }

    goBtn.onclick = () => {
      if (!selectedEl) { alert('\u0627\u062e\u062a\u0631 \u0639\u0646\u0635\u0631\u0627\u064b'); return }
      const intent = input.value.trim() || activeChip || 'improve'

      const xhr = new XMLHttpRequest()
      xhr.open('POST', HELPER + '/intent', true)
      xhr.setRequestHeader('Content-Type', 'application/json')
      xhr.onload = () => {
        goBtn.textContent = '\u062c\u0627\u0631\u064d...'
        ;(goBtn as HTMLButtonElement).disabled = true
        input.value = ''
        selectedEl = null
        removeOutline()
        setTimeout(() => {
          goBtn.textContent = 'Go'
          ;(goBtn as HTMLButtonElement).disabled = false
        }, 1500)
      }
      xhr.onerror = () => { alert('Helper unreachable on port 8400') }
      xhr.send(JSON.stringify({
        intent,
        selector: getSelector(selectedEl),
        html: selectedEl.outerHTML.substring(0, 2000),
      }))
    }

    return () => {
      bar.remove()
      removeOutline()
    }
  }, [])

  return null
}
