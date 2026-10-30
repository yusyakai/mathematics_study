// 画面で使う色（白文字が読めるよう、濃い色を使う）

// 注目箇所の色（番号の順に使う）
export const FOCUS_COLORS = ['#b45309', '#1d4ed8', '#be185d', '#047857', '#6d28d9', '#b91c1c'];
export const focusColor = (index) => FOCUS_COLORS[index % FOCUS_COLORS.length];

// 気づきの種類の色
export const KIND_COLORS = { interpret: '#0369a1', identify: '#6d28d9', select: '#047857', caution: '#b91c1c' };

// 難易度の色（一覧の目印。基本 → 実践の順に、緑 → 青 → 橙 → 赤）
export const DIFFICULTY_COLORS = { C: '#047857', B: '#1d4ed8', A: '#b45309', S: '#be123c' };
