import { useApp } from '../contexts/AppContext';
import { SUBJECTS } from '../data/categories';
import MathText from './MathText';

// 公式データ（科目・単元ごとに整理）
const FORMULAS = {
  数学I: {
    "数と式": [
      { name: "展開公式", formula: "$(a+b)^2 = a^2 + 2ab + b^2$" },
      { name: "展開公式", formula: "$(a-b)^2 = a^2 - 2ab + b^2$" },
      { name: "和と差の積", formula: "$(a+b)(a-b) = a^2 - b^2$" },
      { name: "対称式の基本", formula: "$x^2+y^2 = (x+y)^2 - 2xy$" },
      { name: "3乗の和", formula: "$x^3+y^3 = (x+y)^3 - 3xy(x+y)$" },
      { name: "因数分解", formula: "$a^3+b^3 = (a+b)(a^2-ab+b^2)$" },
      { name: "因数分解", formula: "$a^3-b^3 = (a-b)(a^2+ab+b^2)$" },
    ],
    "二次関数": [
      { name: "標準形", formula: "$y = a(x-p)^2 + q$　頂点$(p, q)$" },
      { name: "平方完成", formula: "$ax^2+bx+c = a(x+\\frac{b}{2a})^2 - \\frac{b^2-4ac}{4a}$" },
      { name: "軸", formula: "$x = -\\frac{b}{2a}$" },
      { name: "判別式", formula: "$D = b^2 - 4ac$" },
      { name: "解の公式", formula: "$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$" },
    ],
    "三角比": [
      { name: "正弦定理", formula: "$\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C} = 2R$" },
      { name: "余弦定理", formula: "$a^2 = b^2 + c^2 - 2bc\\cos A$" },
      { name: "面積", formula: "$S = \\frac{1}{2}ab\\sin C$" },
      { name: "基本関係", formula: "$\\sin^2\\theta + \\cos^2\\theta = 1$" },
      { name: "タンジェント", formula: "$\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}$" },
    ],
  },
  数学A: {
    "場合の数": [
      { name: "順列", formula: "$P(n,r) = \\frac{n!}{(n-r)!}$" },
      { name: "組合せ", formula: "$C(n,r) = \\frac{n!}{r!(n-r)!}$" },
      { name: "重複組合せ", formula: "$H(n,r) = C(n+r-1, r)$" },
    ],
    "確率": [
      { name: "確率の定義", formula: "$P(A) = \\frac{n(A)}{n(U)}$" },
      { name: "余事象", formula: "$P(\\bar{A}) = 1 - P(A)$" },
      { name: "加法定理", formula: "$P(A \\cup B) = P(A) + P(B) - P(A \\cap B)$" },
      { name: "条件付き確率", formula: "$P(A|B) = \\frac{P(A \\cap B)}{P(B)}$" },
    ],
  },
  数学II: {
    "三角関数": [
      { name: "加法定理", formula: "$\\sin(\\alpha \\pm \\beta) = \\sin\\alpha\\cos\\beta \\pm \\cos\\alpha\\sin\\beta$" },
      { name: "加法定理", formula: "$\\cos(\\alpha \\pm \\beta) = \\cos\\alpha\\cos\\beta \\mp \\sin\\alpha\\sin\\beta$" },
      { name: "2倍角", formula: "$\\sin 2\\alpha = 2\\sin\\alpha\\cos\\alpha$" },
      { name: "2倍角", formula: "$\\cos 2\\alpha = \\cos^2\\alpha - \\sin^2\\alpha$" },
      { name: "半角", formula: "$\\sin^2\\frac{\\alpha}{2} = \\frac{1-\\cos\\alpha}{2}$" },
    ],
    "微分": [
      { name: "べき関数の微分", formula: "$(x^n)' = nx^{n-1}$" },
      { name: "積の微分", formula: "$(fg)' = f'g + fg'$" },
      { name: "接線の方程式", formula: "$y - f(a) = f'(a)(x - a)$" },
    ],
    "積分": [
      { name: "べき関数の積分", formula: "$\\int x^n dx = \\frac{x^{n+1}}{n+1} + C$" },
      { name: "面積", formula: "$S = \\int_a^b |f(x)| dx$" },
      { name: "1/6公式", formula: "$\\int_\\alpha^\\beta (x-\\alpha)(x-\\beta) dx = -\\frac{(\\beta-\\alpha)^3}{6}$" },
    ],
  },
  数学B: {
    "数列": [
      { name: "等差数列の一般項", formula: "$a_n = a_1 + (n-1)d$" },
      { name: "等差数列の和", formula: "$S_n = \\frac{n(a_1 + a_n)}{2}$" },
      { name: "等比数列の一般項", formula: "$a_n = a_1 \\cdot r^{n-1}$" },
      { name: "等比数列の和", formula: "$S_n = \\frac{a_1(1-r^n)}{1-r}$" },
    ],
  },
};

export default function FormulaScreen() {
  const { dispatch } = useApp();

  return (
    <div className="formula-screen">
      <div className="review-header">
        <button className="back-btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'home' })}>
          ← 戻る
        </button>
        <h1>公式集</h1>
      </div>

      {Object.entries(FORMULAS).map(([subject, units]) => (
        <div key={subject} className="formula-subject">
          <h2 className="formula-subject-title" style={{ color: SUBJECTS[subject]?.color }}>
            {SUBJECTS[subject]?.label || subject}
          </h2>
          {Object.entries(units).map(([unit, formulas]) => (
            <div key={unit} className="formula-unit">
              <h3 className="formula-unit-title">{unit}</h3>
              <div className="formula-list">
                {formulas.map((f, i) => (
                  <div key={i} className="formula-item">
                    <span className="formula-name">{f.name}</span>
                    <div className="formula-expression">
                      <MathText text={f.formula} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
