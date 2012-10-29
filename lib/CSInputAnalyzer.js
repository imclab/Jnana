(function () {
  "use strict";

  var CS,
    Task;


  if (typeof require !== "undefined" && require !== null) {
    CS = require("./lib/CS.js").CS;
    require("./lib/CSPhraseNote.js");
    require("./lib/CSPhrase.js");
  } else {
    CS = this.CS;
    Task = this.Task;
  }
  
  CS.InputAnalyzer = function () {

    this._previousPhrases = [];

    /**
     *  As a phrase is in the process of being played, this array will store
     *  the incoming notes.
     **/
    this._currentPhraseNotes = [];

    /**
     *  Notes that are on and haven't yet received a noteoff.  Indexed
     *  by the pitch value.
     **/
    this._currentNotesOn = {};
    this._numCurrentNotesOn = 0;

    /**
     *  The Task instance that will run after a period of silence to handle
     *  the end of a phrase.
     **/
    this._endOfPhraseCallback = new Task(function () {

      this.handle_phrase_ended();

    }, this);
    
  };

  CS.InputAnalyzer.prototype = {

    /**
     *  Called from host when new note information is received.
     **/
    handle_notein: function (noteData) {
      var noteAttributes = {},
        note;

      // if this was a noteon event
      if (noteData.noteon) {
        noteAttributes.pitch = noteData.pitch;
        noteAttributes.onVelocity = noteData.velocity;
        noteAttributes.onTime = noteData.time;

        note = new CS.PhraseNote(noteAttributes);

        // note is part of the phrase
        this._currentPhraseNotes.push(noteData);

        // maintain indexed by pitch so we can update it upon noteoff
        this._currentNotesOn[noteAttributes.pitch] = note;
        this._numCurrentNotesOn++;

        // reset end of phrase timeout if it is running
        this._endOfPhraseCallback.cancel();

      // this was a noteoff event
      } else {

        // find note
        note = this._currentNotesOn[noteData.pitch];

        // update note with new information
        note.set({
          offVelocity: noteData.velocity,
          offTime: noteData.time
        });

        // note is no longer on
        this._currentNotesOn[noteData.pitch] = null;
        this._numCurrentNotesOn--;

        // if there are no other notes being held on, start phrase end timer by
        // waiting two seconds before determining that this is the end of the
        // phrase.
        if (this._numCurrentNotesOn === 0) {
          //TODO: timeout duration here should be set based on host
          this._endOfPhraseCallback.schedule(2000);
        }

      }

    },

    handle_phrase_ended: function () {

      var phrase;

      phrase = new CSPhrase({
        notes: this._currentPhraseNotes
      });

      this._previousPhrases.push(phrase);

      this._currentPhraseNotes = [];
      // should already be 0 but just to make sure
      this._numCurrentNotesOn = 0;
      this._currentNotesOn = {};

    }

  };

}).call(this);