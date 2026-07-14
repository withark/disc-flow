"use client";

import { ArrowLeft, Printer } from "lucide-react";
import { FINAL_TIE_BREAK_QUESTION, QUESTIONS, TIE_BREAK_QUESTIONS } from "./disc-questions";

const QUESTION_COLUMNS = [QUESTIONS.slice(0, 12), QUESTIONS.slice(12)];
const SCORE_KEY_ROWS = Array.from({ length: 4 }, (_, row) => QUESTIONS.slice(row * 6, row * 6 + 6));
const PAPER_TIE_BREAK_QUESTIONS = [...TIE_BREAK_QUESTIONS, FINAL_TIE_BREAK_QUESTION];

export function PaperAssessment() {
  function returnToAdmin() {
    window.location.assign(new URL("../admin/", window.location.href).toString());
  }

  return (
    <main className="paper-page">
      <div className="paper-screen-actions">
        <button type="button" className="back-button" onClick={returnToAdmin}><ArrowLeft size={17} /> 관리자 페이지</button>
        <button type="button" className="primary-button" onClick={() => window.print()}><Printer size={17} /> 검사지 인쇄·PDF</button>
      </div>

      <article className="paper-sheet">
        <header className="paper-header">
          <div>
            <span className="paper-brand"><i aria-hidden="true" /> DISC <strong>FLOW</strong></span>
            <p>현장용 DISC 행동유형 검사지</p>
          </div>
          <h1>나의 업무 행동유형 알아보기</h1>
          <div className="paper-fields">
            <span>이름 <i /></span><span>팀/소속 <i /></span><span>날짜 <i /></span>
          </div>
        </header>

        <div className="paper-guide">
          최근 6개월의 실제 행동을 떠올리고, 각 문항에서 오래 고민하지 말고 처음 더 가까웠던 문장 하나에 표시하세요.
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

        <footer className="paper-scoring">
          <div className="paper-score-heading">
            <div><strong>채점</strong><span>선택한 A/B의 유형 코드를 세어 합계를 적으세요.</span></div>
            <div className="paper-score-boxes">
              <span><b>D</b> 주도형 <i /></span><span><b>I</b> 사교형 <i /></span><span><b>S</b> 안정형 <i /></span><span><b>C</b> 신중형 <i /></span>
            </div>
          </div>
          <div className="paper-score-key" aria-label="진행자용 채점표">
            {SCORE_KEY_ROWS.map((row, rowIndex) => (
              <p key={rowIndex}>
                {row.map((question, index) => {
                  const number = rowIndex * 6 + index + 1;
                  return <span key={number}><b>{number}</b> A-{question.a.mode} B-{question.b.mode}</span>;
                })}
              </p>
            ))}
          </div>
          <section className="paper-tie-break" aria-label="동점 판별 문항">
            <header>
              <strong>동점 판별</strong>
              <span>최고점 유형이 2개 이상이면 1~3번에서 동점 유형의 선택지만 비교해 표시합니다. 가장 많이 고른 유형이 1유형이며, 다시 같으면 최종 문항으로 확정합니다.</span>
            </header>
            <div>
              {PAPER_TIE_BREAK_QUESTIONS.map((question, index) => (
                <article key={question.context}>
                  <h3><b>{index < TIE_BREAK_QUESTIONS.length ? index + 1 : "최종"}</b>{question.context}</h3>
                  <p>
                    {(["D", "I", "S", "C"] as const).map((mode) => (
                      <span key={mode}><i aria-hidden="true" /><b>{mode}</b>{question.options[mode]}</span>
                    ))}
                  </p>
                </article>
              ))}
            </div>
          </section>
          <p className="paper-note">가장 높은 점수가 1유형입니다. 최고점 동점일 때만 위의 동점 판별 절차로 하나의 1유형을 확정합니다. 본 검사는 자기이해와 대화를 위한 참고 도구입니다.</p>
        </footer>
      </article>
    </main>
  );
}
