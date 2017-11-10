'use strict';
/*global $*/

class Store {
  constructor() {
    this.page = 'intro',
    this.currentQuestionIndex = null,
    this.userAnswers = [],
    this.feedback = null,
    this.sessionToken = '';
  }
  resetStore(){
    this.page = 'intro';
    this.currentQuestionIndex = null;
    this.userAnswers = [];
    this.feedback = null;
  }
  getScore () {
    return this.userAnswers.reduce((accumulator, userAnswer, index) => {
      const question = this.getQuestion(index);
      if (question.correctAnswer === userAnswer) {
        return accumulator + 1;
      } else {
        return accumulator;
      }
    }, 0);
  }
  getProgress () {
    return {
      current: this.currentQuestionIndex + 1,
      total: questions.QUESTIONS.length
    };
  }
  getCurrentQuestion() {
    return questions.QUESTIONS[this.currentQuestionIndex];
  }
  getQuestion(index) {
    return questions.QUESTIONS[index];
  }
}
const store = new Store();

class API {
  constructor() {
    this.BASE_API_URL = 'https://opentdb.com';
    this.TOP_LEVEL_COMPONENTS = [
      'js-intro', 'js-question', 'js-question-feedback', 
      'js-outro', 'js-quiz-status'
    ];
  }
  buildBaseUrl(amt = 10, query = {}) {
    const url = new URL(this.BASE_API_URL + '/api.php');
    const queryKeys = Object.keys(query);
    url.searchParams.set('amount', amt);
    if (store.sessionToken) {
      url.searchParams.set('token', store.sessionToken);
    }  
    queryKeys.forEach(key => url.searchParams.set(key, query[key]));
    return url;
  }
  buildTokenUrl() {
    return new URL(this.BASE_API_URL + '/api_token.php');
  } 
  fetchToken(callback) {
    if (store.sessionToken) {
      return callback();
    }
    const url = this.buildTokenUrl();
    url.searchParams.set('command', 'request');
    $.getJSON(url, res => {
      store.sessionToken = res.token;
      callback();
    }, err => console.log(err));
  }
}
const api = new API();

const questions = {
  QUESTIONS: [],

  fetchQuestions(amt, query, callback) {
    $.getJSON(api.buildBaseUrl(amt, query), callback, err => console.log(err.message));
  },

  seedQuestions(questions) {
    this.QUESTIONS.length = 0;
    questions.forEach(q => this.QUESTIONS.push(this.createQuestion(q)));
  },
  
  fetchAndSeedQuestions(amt, query, callback) {
    this.fetchQuestions(amt, query, res => {
      this.seedQuestions(res.results);
      callback();
    });
  },

  createQuestion(question) {
    return {
      text: question.question,
      answers: [ ...question.incorrect_answers, question.correct_answer ],
      correctAnswer: question.correct_answer
    };
  },
};

const rendering = {
  hideAll() {
    api.TOP_LEVEL_COMPONENTS.forEach(component => $(`.${component}`).hide());
  },

  render() {
    let html;
    this.hideAll();
  
    const question = store.getCurrentQuestion();
    const { feedback } = store; 
    const { current, total } = store.getProgress();
  
    $('.js-score').html(`<span>Score: ${store.getScore()}</span>`);
    $('.js-progress').html(`<span>Question ${current} of ${total}`);
  
    switch (store.page) {
    case 'intro':
      $('.js-intro').show();
      break;
      
    case 'question':
      html = templates.generateQuestionHtml(question);
      $('.js-question').html(html);
      $('.js-question').show();
      $('.quiz-status').show();
      break;
  
    case 'answer':
      html = templates.generateFeedbackHtml(feedback);
      $('.js-question-feedback').html(html);
      $('.js-question-feedback').show();
      $('.quiz-status').show();
      break;
  
    case 'outro':
      $('.js-outro').show();
      $('.quiz-status').show();
      break;
  
    default:
      return;
    }
  },
};

const templates = {
  generateAnswerItemHtml(answer) {
    return `
      <li class="answer-item">
        <input type="radio" name="answers" value="${answer}" />
        <span class="answer-text">${answer}</span>
      </li>
    `;
  },

  generateQuestionHtml(question) {
    const answers = question.answers
      .map((answer, index) => this.generateAnswerItemHtml(answer, index))
      .join('');

    return `
      <form>
        <fieldset>
          <legend class="question-text">${question.text}</legend>
            ${answers}
            <button type="submit">Submit</button>
        </fieldset>
      </form>
    `;
  },

  generateFeedbackHtml(feedback) {
    return `
      <p>
        ${feedback}
      </p>
      <button class="continue js-continue">Continue</button>
    `;
  },
};

const handlers = {
  handleStartQuiz() {
    store.resetStore();
    store.page = 'question';
    store.currentQuestionIndex = 0;
    const quantity = parseInt($('#js-question-quantity').find(':selected').val(), 10);
    questions.fetchAndSeedQuestions(quantity, { type: 'multiple' }, () => {
      rendering.render();
    });
  },

  handleSubmitAnswer(e) {
    e.preventDefault();
    const question = store.getCurrentQuestion();
    const selected = $('input:checked').val();
    store.userAnswers.push(selected);
    
    if (selected === question.correctAnswer) {
      store.feedback = 'You got it!';
    } else {
      store.feedback = `Too bad! The correct answer was: ${question.correctAnswer}`;
    }
    store.page = 'answer';
    rendering.render();
  },

  handleNextQuestion() {
    if (store.currentQuestionIndex === questions.QUESTIONS.length - 1) {
      store.page = 'outro';
      rendering.render();
      return;
    }

    store.currentQuestionIndex++;
    store.page = 'question';
    rendering.render();
  }
};

$(() => {
  rendering.render();
  api.fetchToken(() => {
    $('.js-start').attr('disabled', false);
  });
  $('.js-intro, .js-outro').on('click', '.js-start', handlers.handleStartQuiz);
  $('.js-question').on('submit', handlers.handleSubmitAnswer);
  $('.js-question-feedback').on('click', '.js-continue', handlers.handleNextQuestion);
});
