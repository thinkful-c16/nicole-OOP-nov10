'use strict';

//pseudocode for OOP refactoring
//Class Store: runs when a new 'store' is initiated
//Class Components: runs whenever we render/hide/show elements on index.html
//Class API: runs when we get the questions from the API

const store = {
  page: 'intro',
  currentQuestionIndex: null,
  userAnswers: [],
  feedback: null,
  sessionToken: '',

  resetStore(){
    this.page = 'intro';
    this.currentQuestionIndex = null;
    this.userAnswers = [];
    this.feedback = null;
  },

  getScore () {
    return this.userAnswers.reduce((accumulator, userAnswer, index) => {
      const question = this.getQuestion(index);

      if (question.correctAnswer === userAnswer) {
        return accumulator + 1;
      } else {
        return accumulator;
      }
    }, 0);
  },

  getProgress () {
    return {
      current: this.currentQuestionIndex + 1,
      total: questions.QUESTIONS.length
    };
  },

  getCurrentQuestion() {
    return questions.QUESTIONS[this.currentQuestionIndex];
  },
 
  getQuestion(index) {
    return questions.QUESTIONS[index];
  },
};

const api = {
  BASE_API_URL: 'https://opentdb.com',
  TOP_LEVEL_COMPONENTS: [
    'js-intro', 'js-question', 'js-question-feedback', 
    'js-outro', 'js-quiz-status'
  ],
  
  buildBaseUrl(amt = 10, query = {}) {
    const url = new URL(this.BASE_API_URL + '/api.php');
    const queryKeys = Object.keys(query);
    url.searchParams.set('amount', amt);

    if (store.sessionToken) {
      url.searchParams.set('token', store.sessionToken);
    }

    queryKeys.forEach(key => url.searchParams.set(key, query[key]));
    return url;
  },

  buildTokenUrl() {
    return new URL(this.BASE_API_URL + '/api_token.php');
  },

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
  },
};

const questions = {
  QUESTIONS: [],

  fetchQuestions(amt, query, callback) {
    $.getJSON(api.buildBaseUrl(amt, query), callback, err => console.log(err.message));
  },

  seedQuestions(questions) {
    this.QUESTIONS.length = 0;
    questions.forEach(q => this.QUESTIONS.push(createQuestion(q)));
  },
  
  fetchAndSeedQuestions(amt, query, callback) {
    fetchQuestions(amt, query, res => {
      seedQuestions(res.results);
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



// Helper functions
// ===============
const hideAll = function() {
  TOP_LEVEL_COMPONENTS.forEach(component => $(`.${component}`).hide());
};


// HTML generator functions
// ========================
const generateAnswerItemHtml = function(answer) {
  return `
    <li class="answer-item">
      <input type="radio" name="answers" value="${answer}" />
      <span class="answer-text">${answer}</span>
    </li>
  `;
};

const generateQuestionHtml = function(question) {
  const answers = question.answers
    .map((answer, index) => generateAnswerItemHtml(answer, index))
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
};

const generateFeedbackHtml = function(feedback) {
  return `
    <p>
      ${feedback}
    </p>
    <button class="continue js-continue">Continue</button>
  `;
};

// Render function - uses `store` object to construct entire page every time it's run
// ===============
const render = function() {
  let html;
  hideAll();

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
    html = generateQuestionHtml(question);
    $('.js-question').html(html);
    $('.js-question').show();
    $('.quiz-status').show();
    break;

  case 'answer':
    html = generateFeedbackHtml(feedback);
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
};

// Event handler functions
// =======================
const handleStartQuiz = function() {
  store.resetStore;
  store.page = 'question';
  store.currentQuestionIndex = 0;
  const quantity = parseInt($('#js-question-quantity').find(':selected').val(), 10);
  fetchAndSeedQuestions(quantity, { type: 'multiple' }, () => {
    render();
  });
};

const handleSubmitAnswer = function(e) {
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
  render();
};

const handleNextQuestion = function() {
  if (store.currentQuestionIndex === QUESTIONS.length - 1) {
    store.page = 'outro';
    render();
    return;
  }

  store.currentQuestionIndex++;
  store.page = 'question';
  render();
};

// On DOM Ready, run render() and add event listeners
$(() => {
  // Run first render
  render();

  // Fetch session token, enable Start button when complete
  fetchToken(() => {
    $('.js-start').attr('disabled', false);
  });

  $('.js-intro, .js-outro').on('click', '.js-start', handleStartQuiz);
  $('.js-question').on('submit', handleSubmitAnswer);
  $('.js-question-feedback').on('click', '.js-continue', handleNextQuestion);
});
