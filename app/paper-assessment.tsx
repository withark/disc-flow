"use client";

import { ArrowLeft, Printer } from "lucide-react";
import { FINAL_TIE_BREAK_QUESTION, QUESTIONS, TIE_BREAK_QUESTIONS } from "./disc-questions";

const QUESTION_COLUMNS = [QUESTIONS.slice(0, 12), QUESTIONS.slice(12)];
const SCORE_KEY_COLUMNS = [QUESTIONS.slice(0, 12), QUESTIONS.slice(12)];
const PAPER_TIE_BREAK_QUESTIONS = [...TIE_BREAK_QUESTIONS, FINAL_TIE_BREAK_QUESTION];
const MODE_NAMES = { D: "주도형", I: "사교형", S: "안정형", C: "신중형" } as const;
const MODE_GUIDES = {
  D: { title: "결과를 향해 빠르게 움직입니다", strength: "결단, 도전, 실행", watch: "속도를 내기 전에 다른 의견과 세부 조건을 확인합니다." },
  I: { title: "사람의 참여와 에너지를 이끕니다", strength: "표현, 설득, 관계", watch: "아이디어를 담당자, 기한, 다음 행동으로 마무리합니다." },
  S: { title: "신뢰와 안정적인 흐름을 만듭니다", strength: "경청, 협력, 꾸준함", watch: "불편한 점과 필요한 반대를 조금 더 일찍 표현합니다." },
  C: { title: "근거와 기준으로 품질을 높입니다", strength: "분석, 정확성, 체계", watch: "충분한 기준이 모이면 결정 시점을 늦추지 않습니다." },
} as const;

export function PaperAssessment() {
  function returnToAdmin() {
    window.location.assign(new URL("../admin/", window.location.href).toString());
  }

  return (
    <main className="paper-page">
      <div className="paper-screen-actions">
        <button type="button" className="back-button" onClick={returnToAdmin}><ArrowLeft size={17} /> 관리자 페이지</button>
        <button type="button" className="primary-button" onClick={() => window.print()}><Printer size={17} /> 질문지·해설지 2장 인쇄</button>
      </div>

      <article className="paper-sheet paper-question-sheet">
        <header className="paper-header">
          <div>
            <span className="paper-brand"><i aria-hidden="true" /> DISC <strong>FLOW</strong></span>
            <p>오프라인 행동유형 검사 · 질문지</p>
          </div>
          <h1>나의 행동유형 알아보기</h1>
          <div className="paper-fields">
            <span>이름 <i /></span><span>팀/소속 <i /></span><span>날짜 <i /></span>
          </div>
        </header>

        <div className="paper-guide">
          <strong>답변 방법</strong>
          <span>최근 6개월의 실제 행동을 떠올립니다.</span>
          <span>각 문항에서 나에게 더 가까운 문장 하나만 선택합니다.</span>
          <span>정답을 찾지 말고 처음 떠오른 답에 표시합니다.</span>
        </div>

        <section className="paper-question-columns" aria-label="DISC 검사지 24문항">
          {QUESTION_COLUMNS.map((column, columnIndex) => (
            <ol key={columnIndex} start={columnIndex * 12 + 1}>
              {column.map((question, index) => {
                const number = columnIndex * 12 + index + 1;
                return (
                  <li key={question.context} value={number}>
                    <h2><b>{number}</b>{question.context}</h2>
                    <p><i aria-hidden="true" /><strong>A</strong><span>{question.a.text}</span></p>
                    <p><i aria-hidden="true" /><strong>B</strong><span>{question.b.text}</span></p>
                  </li>
                );
              })}
            </ol>
          ))}
        </section>

        <footer className="paper-page-footer">
          <span>응답을 마치면 질문지를 진행자에게 전달하세요.</span>
          <b>1 / 2 · 질문지</b>
        </footer>
      </article>

      <article className="paper-sheet paper-explanation-sheet">
        <header className="paper-header paper-explanation-header">
          <div>
            <span className="paper-brand"><i aria-hidden="true" /> DISC <strong>FLOW</strong></span>
            <p>오프라인 행동유형 검사 · 채점 및 해설지</p>
          </div>
          <h1>채점하고 결과 읽기</h1>
          <div className="paper-result-field">이름 <i /></div>
        </header>

        <section className="paper-score-steps" aria-label="채점 방법">
          <article><b>1</b><div><strong>선택 확인</strong><span>질문지에서 체크한 A 또는 B를 확인합니다.</span></div></article>
          <article><b>2</b><div><strong>유형으로 바꾸기</strong><span>아래 표에서 해당 유형을 찾아 1점씩 셉니다.</span></div></article>
          <article><b>3</b><div><strong>합계와 1유형</strong><span>합계 24점을 확인하고 가장 높은 유형을 찾습니다.</span></div></article>
        </section>

        <section className="paper-score-key-section">
          <div className="paper-section-title">
            <div><span>SCORING KEY</span><h2>문항별 채점표</h2></div>
            <p><b>예시</b> 1번에서 A를 선택했다면 <strong>D 주도형</strong>에 1점을 더합니다.</p>
          </div>
          <div className="paper-score-tables" aria-label="진행자용 채점표">
            {SCORE_KEY_COLUMNS.map((column, columnIndex) => (
              <table key={columnIndex}>
                <thead><tr><th>문항</th><th>A를 체크했다면</th><th>B를 체크했다면</th></tr></thead>
                <tbody>
                  {column.map((question, index) => {
                    const number = columnIndex * 12 + index + 1;
                    return (
                      <tr key={number}>
                        <th>{number}</th>
                        <td><b>{question.a.mode}</b> {MODE_NAMES[question.a.mode]}</td>
                        <td><b>{question.b.mode}</b> {MODE_NAMES[question.b.mode]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ))}
          </div>
        </section>

        <section className="paper-score-result">
          <div><span>유형별 합계</span><p>네 칸의 합은 반드시 <b>24점</b>이어야 합니다.</p></div>
          <div className="paper-score-boxes">
            {(["D", "I", "S", "C"] as const).map((mode) => (
              <span key={mode}><b>{mode}</b><em>{MODE_NAMES[mode]}</em><i /></span>
            ))}
          </div>
        </section>

        <section className="paper-tie-break" aria-label="동점 판별 문항">
          <div className="paper-section-title tie-title">
            <div><span>TIE BREAK</span><h2>최고점이 같을 때</h2></div>
            <p><b>예시</b> D와 I가 동점이면 아래에서 <strong>D와 I 문장만</strong> 비교해 하나를 고릅니다. 1~3번에서 더 많이 고른 유형이 1유형입니다. 다시 같으면 최종 문항으로 정합니다.</p>
          </div>
          <div className="paper-tie-grid">
            {PAPER_TIE_BREAK_QUESTIONS.map((question, index) => (
              <article key={question.context}>
                <h3><b>{index < TIE_BREAK_QUESTIONS.length ? index + 1 : "최종"}</b>{question.context}</h3>
                <div>
                  {(["D", "I", "S", "C"] as const).map((mode) => (
                    <span key={mode}><i aria-hidden="true" /><b>{mode}</b>{question.options[mode]}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="paper-mode-guide">
          <div className="paper-section-title">
            <div><span>RESULT GUIDE</span><h2>1유형 빠른 해설</h2></div>
            <p>가장 높은 점수가 현재 자주 사용하는 <strong>1유형</strong>입니다.</p>
          </div>
          <div>
            {(["D", "I", "S", "C"] as const).map((mode) => (
              <article key={mode} className={`paper-mode-${mode.toLowerCase()}`}>
                <header><b>{mode}</b><div><strong>{MODE_NAMES[mode]}</strong><span>{MODE_GUIDES[mode].title}</span></div></header>
                <p><b>강점</b> {MODE_GUIDES[mode].strength}</p>
                <p><b>균형</b> {MODE_GUIDES[mode].watch}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="paper-page-footer explanation-footer">
          <span>이 결과는 자기이해와 대화를 돕는 참고 자료이며 의학적·심리학적 진단이 아닙니다.</span>
          <b>2 / 2 · 채점 및 해설지</b>
        </footer>
      </article>
    </main>
  );
}
