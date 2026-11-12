package com.kothaflow.ime

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.inputmethodservice.InputMethodService
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.view.KeyEvent
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.ImageButton
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat

class VoiceFlowInputMethodService : InputMethodService() {

    companion object {
        var activeInputConnection: InputConnection? = null
            private set
        var activeInstance: VoiceFlowInputMethodService? = null
            private set

        fun commitTextDirectly(text: String): Boolean {
            val ic = activeInputConnection ?: activeInstance?.currentInputConnection ?: return false
            return try {
                ic.commitText(text, 1)
            } catch (_: Exception) {
                false
            }
        }
    }

    override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
        super.onStartInputView(info, restarting)
        activeInstance = this
        activeInputConnection = currentInputConnection
    }

    override fun onFinishInputView(finishingInput: Boolean) {
        super.onFinishInputView(finishingInput)
        if (finishingInput) {
            activeInputConnection = null
            if (activeInstance == this) activeInstance = null
        }
    }

    private var speechRecognizer: SpeechRecognizer? = null
    private var isListening = false
    private var currentLangCode = "bn-BD"
    private var currentLangLabel = "🇧🇩 বাংলা"

    private var tvKbLang: TextView? = null
    private var tvKbStatus: TextView? = null
    private var tvKbPrompt: TextView? = null
    private var btnKbMic: ImageButton? = null

    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onCreateInputView(): View {
        val view = layoutInflater.inflate(R.layout.keyboard_view, null)

        tvKbLang = view.findViewById(R.id.tvKbLang)
        tvKbStatus = view.findViewById(R.id.tvKbStatus)
        tvKbPrompt = view.findViewById(R.id.tvKbPrompt)
        btnKbMic = view.findViewById(R.id.btnKbMic)

        val btnSwitchKb: Button = view.findViewById(R.id.btnSwitchKb)
        val btnKeyComma: Button = view.findViewById(R.id.btnKeyComma)
        val btnKeyDari: Button = view.findViewById(R.id.btnKeyDari)
        val btnKeyQuestion: Button = view.findViewById(R.id.btnKeyQuestion)
        val btnKeySpace: Button = view.findViewById(R.id.btnKeySpace)
        val btnKeyBackspace: Button = view.findViewById(R.id.btnKeyBackspace)
        val btnKeyEnter: Button = view.findViewById(R.id.btnKeyEnter)

        // Toggle Language
        tvKbLang?.text = currentLangLabel
        tvKbLang?.setOnClickListener {
            if (currentLangCode == "bn-BD") {
                currentLangCode = "en-US"
                currentLangLabel = "🇺🇸 English"
            } else {
                currentLangCode = "bn-BD"
                currentLangLabel = "🇧🇩 বাংলা"
            }
            tvKbLang?.text = currentLangLabel
            tvKbStatus?.text = "ভাষা: $currentLangLabel"
        }

        // Switch Keyboard (to Gboard, Ridmik, etc.)
        btnSwitchKb.setOnClickListener {
            val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
            imm.showInputMethodPicker()
        }

        // Punctuation & Navigation keys
        btnKeyComma.setOnClickListener {
            currentInputConnection?.commitText(", ", 1)
        }

        btnKeyDari.setOnClickListener {
            currentInputConnection?.commitText("। ", 1)
        }

        btnKeyQuestion.setOnClickListener {
            currentInputConnection?.commitText("? ", 1)
        }

        btnKeySpace.setOnClickListener {
            currentInputConnection?.commitText(" ", 1)
        }

        btnKeyBackspace.setOnClickListener {
            val ic = currentInputConnection ?: return@setOnClickListener
            val selected = ic.getSelectedText(0)
            if (selected.isNullOrEmpty()) {
                ic.deleteSurroundingText(1, 0)
            } else {
                ic.commitText("", 1)
            }
        }

        btnKeyEnter.setOnClickListener {
            val ic = currentInputConnection ?: return@setOnClickListener
            val info = currentInputEditorInfo
            val action = info?.imeOptions ?: 0
            val actionId = action and EditorInfo.IME_MASK_ACTION

            if (actionId != EditorInfo.IME_ACTION_NONE && actionId != EditorInfo.IME_ACTION_UNSPECIFIED) {
                ic.performEditorAction(actionId)
            } else {
                ic.sendKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ENTER))
                ic.sendKeyEvent(KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_ENTER))
            }
        }

        // Mic Button: Voice Dictation
        btnKbMic?.setOnClickListener {
            handleMicClick()
        }

        return view
    }

    private fun handleMicClick() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            Toast.makeText(this, "মাইক্রোফোন পারমিশন দিতে KothaFlow অ্যাপ খুলুন", Toast.LENGTH_LONG).show()
            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(intent)
            return
        }

        if (!isListening) {
            startListening()
        } else {
            stopListening()
        }
    }

    private fun startListening() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            Toast.makeText(this, "স্পিচ সার্ভিস উপলব্ধ নেই", Toast.LENGTH_SHORT).show()
            return
        }

        try {
            speechRecognizer?.destroy()
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)

            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, currentLangCode)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, currentLangCode)
                putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, currentLangCode)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            }

            speechRecognizer?.setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) {
                    isListening = true
                    mainHandler.post {
                        tvKbPrompt?.text = "রেকর্ডিং চলছে... কথা বলুন..."
                        tvKbStatus?.text = "🔴 শুনছি..."
                        btnKbMic?.setImageResource(android.R.drawable.ic_media_pause)
                    }
                }

                override fun onBeginningOfSpeech() {}
                override fun onRmsChanged(rmsdB: Float) {}
                override fun onBufferReceived(buffer: ByteArray?) {}
                override fun onEndOfSpeech() {
                    mainHandler.post {
                        tvKbPrompt?.text = "প্রসেসিং হচ্ছে..."
                        tvKbStatus?.text = "⏳ টেক্সট তৈরি হচ্ছে..."
                    }
                }

                override fun onError(error: Int) {
                    isListening = false
                    mainHandler.post {
                        tvKbPrompt?.text = "মাইক চেপে আবার কথা বলুন"
                        tvKbStatus?.text = "KothaFlow ভয়েস কিবোর্ড"
                        btnKbMic?.setImageResource(android.R.drawable.ic_btn_speak_now)
                    }
                }

                override fun onResults(results: Bundle?) {
                    isListening = false
                    mainHandler.post {
                        tvKbPrompt?.text = "মাইক চেপে কথা বলুন..."
                        tvKbStatus?.text = "✅ সম্পন্ন"
                        btnKbMic?.setImageResource(android.R.drawable.ic_btn_speak_now)

                        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        if (!matches.isNullOrEmpty()) {
                            val rawText = matches[0].trim()
                            val cleaned = cleanSpokenText(rawText)
                            if (cleaned.isNotEmpty()) {
                                currentInputConnection?.commitText("$cleaned ", 1)
                            }
                        }
                    }
                }

                override fun onPartialResults(partialResults: Bundle?) {
                    val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    if (!matches.isNullOrEmpty()) {
                        mainHandler.post {
                            tvKbPrompt?.text = matches[0]
                        }
                    }
                }

                override fun onEvent(eventType: Int, params: Bundle?) {}
            })

            speechRecognizer?.startListening(intent)
        } catch (e: Exception) {
            isListening = false
            tvKbPrompt?.text = "মাইক চালাতে সমস্যা হয়েছে"
        }
    }

    private fun stopListening() {
        try {
            speechRecognizer?.stopListening()
        } catch (_: Exception) {}
        isListening = false
        tvKbPrompt?.text = "মাইক চেপে কথা বলুন..."
        tvKbStatus?.text = "KothaFlow ভয়েস কিবোর্ড"
        btnKbMic?.setImageResource(android.R.drawable.ic_btn_speak_now)
    }

    private fun cleanSpokenText(text: String): String {
        var clean = text
        val fillers = listOf(" um ", " uh ", " ah ", " আর কি ", " এই যে ", " আআ ")
        for (filler in fillers) {
            clean = clean.replace(Regex("(?i)$filler"), " ")
        }
        return clean.trim().replace(Regex("\\s+"), " ")
    }

    override fun onDestroy() {
        super.onDestroy()
        speechRecognizer?.destroy()
        speechRecognizer = null
    }
}
