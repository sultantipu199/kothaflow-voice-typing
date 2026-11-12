package com.kothaflow.ime

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Settings
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var btnEnableKeyboard: Button
    private lateinit var btnSelectKeyboard: Button
    private lateinit var tvStatus: TextView
    private lateinit var etTestInput: EditText
    private lateinit var btnTestMic: ImageButton
    private lateinit var tvMicStatus: TextView

    private var speechRecognizer: SpeechRecognizer? = null
    private var isListening = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        btnEnableKeyboard = findViewById(R.id.btnEnableKeyboard)
        btnSelectKeyboard = findViewById(R.id.btnSelectKeyboard)
        tvStatus = findViewById(R.id.tvStatus)
        etTestInput = findViewById(R.id.etTestInput)
        btnTestMic = findViewById(R.id.btnTestMic)
        tvMicStatus = findViewById(R.id.tvMicStatus)

        // Setup step 1: Open system keyboard settings
        btnEnableKeyboard.setOnClickListener {
            try {
                val intent = Intent(Settings.ACTION_INPUT_METHOD_SETTINGS)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                startActivity(intent)
            } catch (e: Exception) {
                Toast.makeText(this, "সেটিংস খুলতে ব্যর্থ হয়েছে", Toast.LENGTH_SHORT).show()
            }
        }

        // Setup step 2: Show keyboard picker dialog
        btnSelectKeyboard.setOnClickListener {
            val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
            imm.showInputMethodPicker()
        }

        // Setup mic button for testing
        btnTestMic.setOnClickListener {
            checkMicPermissionAndRecord()
        }

        requestAudioPermissionIfNeeded()
    }

    override fun onResume() {
        super.onResume()
        updateKeyboardStatus()
    }

    private fun isKeyboardEnabled(): Boolean {
        val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
        val enabledMethods = imm.enabledInputMethodList
        val myPackageName = packageName
        return enabledMethods.any { it.packageName == myPackageName }
    }

    private fun updateKeyboardStatus() {
        val isEnabled = isKeyboardEnabled()
        if (isEnabled) {
            tvStatus.text = "✅ KothaFlow কিবোর্ড সিস্টেমে সচল (Enabled) আছে!"
            tvStatus.setTextColor(0xFF10B981.toInt()) // green
            btnEnableKeyboard.text = "✓ কীবোর্ড সক্রিয় করা আছে"
            btnEnableKeyboard.isEnabled = true
        } else {
            tvStatus.text = "⚠️ KothaFlow এখনো বন্ধ আছে। উপরের ১ নং বাটনে চাপ দিয়ে চালু করুন।"
            tvStatus.setTextColor(0xFFF59E0B.toInt()) // amber
            btnEnableKeyboard.text = "১. কীবোর্ড সেটিংস এ KothaFlow অন করুন"
        }
    }

    private fun requestAudioPermissionIfNeeded() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.RECORD_AUDIO),
                101
            )
        }
    }

    private fun checkMicPermissionAndRecord() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), 101)
            return
        }

        if (!isListening) {
            startSpeechRecognition()
        } else {
            stopSpeechRecognition()
        }
    }

    private fun startSpeechRecognition() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            Toast.makeText(this, "আপনার ডিভাইসে স্পিচ রিকগনিশন উপলব্ধ নেই", Toast.LENGTH_LONG).show()
            return
        }

        speechRecognizer?.destroy()
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "bn-BD")
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "bn-BD")
            putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, "bn-BD")
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_PROMPT, "বাংলা বা ইংরেজিতে কথা বলুন...")
        }

        speechRecognizer?.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                isListening = true
                tvMicStatus.text = "রেকর্ডিং চলছে... কথা বলুন..."
                tvMicStatus.setTextColor(0xFF38BDF8.toInt())
            }

            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {
                tvMicStatus.text = "প্রসেসিং হচ্ছে..."
            }

            override fun onError(error: Int) {
                isListening = false
                tvMicStatus.text = "মাইক চেপে আবার কথা বলুন"
                tvMicStatus.setTextColor(0xFF94A3B8.toInt())
            }

            override fun onResults(results: Bundle?) {
                isListening = false
                tvMicStatus.text = "মাইক চেপে কথা বলুন (বাংলা বা ইংরেজি)"
                tvMicStatus.setTextColor(0xFF94A3B8.toInt())

                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if (!matches.isNullOrEmpty()) {
                    var spokenText = matches[0].trim()
                    // Clean filler words
                    spokenText = cleanSpokenText(spokenText)
                    val existing = etTestInput.text.toString()
                    val newText = if (existing.isEmpty()) spokenText else "$existing $spokenText"
                    etTestInput.setText(newText)
                    etTestInput.setSelection(newText.length)
                }
            }

            override fun onPartialResults(partialResults: Bundle?) {
                val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if (!matches.isNullOrEmpty()) {
                    tvMicStatus.text = "শুনছি: \"${matches[0]}\""
                }
            }

            override fun onEvent(eventType: Int, params: Bundle?) {}
        })

        speechRecognizer?.startListening(intent)
    }

    private fun stopSpeechRecognition() {
        speechRecognizer?.stopListening()
        isListening = false
        tvMicStatus.text = "মাইক চেপে কথা বলুন (বাংলা বা ইংরেজি)"
        tvMicStatus.setTextColor(0xFF94A3B8.toInt())
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
    }
}
