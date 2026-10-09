// ÜRETİLDİ — elle düzenleme. Kaynak: sinav-mono-repo (npm run sync:mobile).
// ÜRETİLDİ: npm run tokens:build
export const tokens = {
  "light": {
    "bg": {
      "canvas": "#F4F6F5",
      "surface": "#FFFFFF",
      "raised": "#FFFFFF",
      "input": "#FFFFFF",
      "selected": "#DCEDEC",
      "hover": "rgba(19,35,42,0.04)",
      "pressed": "rgba(19,35,42,0.08)",
      "inverse": "#13232A",
      "scrim": "rgba(19,35,42,0.48)"
    },
    "text": {
      "primary": "#13232A",
      "reading": "#13232A",
      "secondary": "#46565C",
      "tertiary": "#5E6B70",
      "disabled": "#9AA7A8",
      "inverse": "#F4F6F5",
      "link": "#0E6A6E",
      "on-accent": "#FFFFFF"
    },
    "border": {
      "subtle": "#E9EDEC",
      "default": "#DAE1E0",
      "strong": "#C3CDCC",
      "input": "#77868A",
      "focus": "#0E6A6E"
    },
    "accent": {
      "default": "#0E6A6E",
      "hover": "#0A5458",
      "pressed": "#0B4043",
      "subtle-bg": "#DCEDEC",
      "subtle-fg": "#0A5458"
    },
    "reward": {
      "default": "#E9A514",
      "subtle-bg": "#FBEFD2",
      "icon": "#B68116",
      "on": "#13232A"
    },
    "success": {
      "fg": "#1F7A45",
      "bg": "#DFF1E6",
      "border": "#83D2A1"
    },
    "danger": {
      "fg": "#A33D27",
      "bg": "#F8E3DC",
      "border": "#F3A992"
    },
    "warning": {
      "fg": "#714E04",
      "bg": "#FBEFD2",
      "border": "#F4CB78"
    },
    "blank": {
      "fg": "#5E6B70",
      "bg": "#E9EDEC"
    },
    "exam": {
      "paper": "#FFFFFF",
      "ink": "#000000"
    },
    "chart": {
      "series-1": "#0F9485",
      "series-2": "#505AC8",
      "series-3": "#BA7F14",
      "series-4": "#9E427B",
      "muted": "#A3B1B0",
      "grid": "#E9EDEC",
      "axis": "#C3CDCC",
      "target": "#E9A514",
      "seq-1": "#DCEDEC",
      "seq-2": "#B4DEDB",
      "seq-3": "#87CDC8",
      "seq-4": "#4DB6B0",
      "seq-5": "#2D8D8D",
      "seq-6": "#0E6A6E"
    }
  },
  "dark": {
    "bg": {
      "canvas": "#0E171B",
      "surface": "#142127",
      "raised": "#1B2B32",
      "input": "#0E171B",
      "selected": "#16363A",
      "hover": "rgba(228,236,236,0.06)",
      "pressed": "rgba(228,236,236,0.10)",
      "inverse": "#E4ECEC",
      "scrim": "rgba(0,0,0,0.60)"
    },
    "text": {
      "primary": "#E4ECEC",
      "reading": "#D3DCDC",
      "secondary": "#A9B8BA",
      "tertiary": "#8D9DA1",
      "disabled": "#5C6D72",
      "inverse": "#13232A",
      "link": "#4DB6B0",
      "on-accent": "#0E171B"
    },
    "border": {
      "subtle": "#1F2F35",
      "default": "#24343A",
      "strong": "#33474E",
      "input": "#71838A",
      "focus": "#4DB6B0"
    },
    "accent": {
      "default": "#4DB6B0",
      "hover": "#87CDC8",
      "pressed": "#B4DEDB",
      "subtle-bg": "#16363A",
      "subtle-fg": "#87CDC8"
    },
    "reward": {
      "default": "#F0B43A",
      "subtle-bg": "#3A2E12",
      "icon": "#F0B43A",
      "on": "#0E171B"
    },
    "success": {
      "fg": "#4CC27D",
      "bg": "#163524",
      "border": "#359D60"
    },
    "danger": {
      "fg": "#EE8A6E",
      "bg": "#3D211A",
      "border": "#C9654B"
    },
    "warning": {
      "fg": "#F0B43A",
      "bg": "#3A2E12",
      "border": "#91650B"
    },
    "blank": {
      "fg": "#9AA7A8",
      "bg": "#22343B"
    },
    "exam": {
      "paper": "#FFFFFF",
      "ink": "#000000"
    },
    "chart": {
      "series-1": "#04A19B",
      "series-2": "#7483E0",
      "series-3": "#C0851F",
      "series-4": "#C06099",
      "muted": "#4F646A",
      "grid": "#1F2F35",
      "axis": "#33474E",
      "target": "#F0B43A",
      "seq-1": "#0A2F31",
      "seq-2": "#0B4043",
      "seq-3": "#0A5458",
      "seq-4": "#0E6A6E",
      "seq-5": "#2D8D8D",
      "seq-6": "#4DB6B0"
    }
  },
  "space": {
    "1": 2,
    "2": 4,
    "3": 8,
    "4": 12,
    "5": 16,
    "6": 20,
    "7": 24,
    "8": 32,
    "9": 40,
    "10": 48,
    "11": 64,
    "12": 80,
    "13": 96
  },
  "radius": {
    "0": 0,
    "xs": 4,
    "sm": 8,
    "md": 12,
    "lg": 16,
    "xl": 24,
    "full": 999
  },
  "motion": {
    "instant": 0,
    "fast": 100,
    "base": 200,
    "moderate": 280,
    "slow": 400,
    "celebrate": 900
  },
  "font": {
    "ui": "'Figtree', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    "reading": "'Literata', Georgia, 'Times New Roman', serif",
    "brand": "'Bricolage Grotesque', 'Figtree', sans-serif",
    "mono": "'SF Mono', 'Roboto Mono', Menlo, monospace"
  },
  "type": {
    "display-l": {
      "family": "brand",
      "size": [
        40,
        56
      ],
      "line": [
        44,
        60
      ],
      "weight": 700,
      "tracking": -0.02
    },
    "display-m": {
      "family": "brand",
      "size": [
        32,
        44
      ],
      "line": [
        36,
        48
      ],
      "weight": 700,
      "tracking": -0.015
    },
    "heading-1": {
      "family": "ui",
      "size": [
        28,
        32
      ],
      "line": [
        34,
        40
      ],
      "weight": 700,
      "tracking": -0.01
    },
    "heading-2": {
      "family": "ui",
      "size": [
        22,
        24
      ],
      "line": [
        28,
        32
      ],
      "weight": 700,
      "tracking": -0.005
    },
    "heading-3": {
      "family": "ui",
      "size": [
        18,
        20
      ],
      "line": [
        24,
        28
      ],
      "weight": 600,
      "tracking": 0
    },
    "title": {
      "family": "ui",
      "size": [
        16,
        17
      ],
      "line": [
        22,
        24
      ],
      "weight": 600,
      "tracking": 0
    },
    "body-l": {
      "family": "ui",
      "size": [
        17,
        18
      ],
      "line": [
        26,
        28
      ],
      "weight": 400,
      "tracking": 0
    },
    "body-m": {
      "family": "ui",
      "size": [
        16,
        16
      ],
      "line": [
        24,
        24
      ],
      "weight": 400,
      "tracking": 0
    },
    "body-s": {
      "family": "ui",
      "size": [
        14,
        14
      ],
      "line": [
        20,
        20
      ],
      "weight": 400,
      "tracking": 0
    },
    "label-l": {
      "family": "ui",
      "size": [
        16,
        16
      ],
      "line": [
        20,
        20
      ],
      "weight": 600,
      "tracking": 0
    },
    "label-m": {
      "family": "ui",
      "size": [
        14,
        14
      ],
      "line": [
        18,
        18
      ],
      "weight": 600,
      "tracking": 0.005
    },
    "label-s": {
      "family": "ui",
      "size": [
        12,
        12
      ],
      "line": [
        16,
        16
      ],
      "weight": 600,
      "tracking": 0.02
    },
    "caption": {
      "family": "ui",
      "size": [
        12,
        13
      ],
      "line": [
        16,
        18
      ],
      "weight": 400,
      "tracking": 0
    },
    "overline": {
      "family": "ui",
      "size": [
        11,
        12
      ],
      "line": [
        14,
        16
      ],
      "weight": 700,
      "tracking": 0.08
    },
    "reading-l": {
      "family": "reading",
      "size": [
        18,
        19
      ],
      "line": [
        29,
        32
      ],
      "weight": 400,
      "tracking": 0
    },
    "reading-m": {
      "family": "reading",
      "size": [
        17,
        18
      ],
      "line": [
        27,
        29
      ],
      "weight": 400,
      "tracking": 0
    },
    "reading-s": {
      "family": "reading",
      "size": [
        16,
        17
      ],
      "line": [
        25,
        26
      ],
      "weight": 400,
      "tracking": 0
    },
    "numeric-xl": {
      "family": "ui",
      "size": [
        48,
        64
      ],
      "line": [
        52,
        68
      ],
      "weight": 700,
      "tracking": -0.02
    },
    "numeric-l": {
      "family": "ui",
      "size": [
        28,
        32
      ],
      "line": [
        32,
        36
      ],
      "weight": 700,
      "tracking": 0
    },
    "numeric-m": {
      "family": "ui",
      "size": [
        20,
        22
      ],
      "line": [
        24,
        28
      ],
      "weight": 600,
      "tracking": 0
    }
  }
};
export const { light, dark, space, radius, motion, font, type } = tokens;
export default tokens;
