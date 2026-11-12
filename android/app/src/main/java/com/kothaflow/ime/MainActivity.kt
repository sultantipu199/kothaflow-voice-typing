package com.kothaflow.ime

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
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

class MainActivity : AppCompatActivity() {

    private lateinit var tvBubbleStatusBadge: TextView
    private lateinit var btnToggleBubble: Button
    private lateinit var tvAccessStatusBadge: TextView
    private lateinit var btnEnableAccessibility: Button
    private lateinit var etTestInput: EditText
    private lateinit var btnTestMic: ImageButton
    private lateinit var tvMicStatus: TextView
    private lateinit var btnEnableKeyboard: Button
    private lateinit var btnSelectKeyboard: Button

    private var speechRecognizer: SpeechRecognizer? = null
    private var isListening = false

    companion object {
        private const val REQ_OVERLAY_PERMISSION = 1001
        private const val REQ_AUDIO_PERMISSION = 1002
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvBubbleStatusBadge = findViewById(R.id.tvBubbleStatusBadge)
        btnToggleBubble = findViewById(R.id.btnToggleBubble)
        tvAccessStatusBadge = findViewById(R.id.tvAccessStatusBadge)
        btnEnableAccessibility = findViewById(R.id.btnEnableAccessibility)
        etTestInput = findViewById(R.id.etTestInput)
        btnTestMic = findViewById(R.id.btnTestMic)
        tvMicStatus = findViewById(R.id.tvMicStatus)
        btnEnableKeyboard = findViewById(R.id.btnEnableKeyboard)
        btnSelectKeyboard = findViewById(R.id.btnSelectKeyboard)

        // 1. Floating Bubble Toggle
        btnToggleBubble.setOnClickListener {
            handleBubbleToggle()
        }

        // 2. Accessibility Service Button
        btnEnableAccessibility.setOnClickListener {
            try {
                val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                startActivity(intent)
                Toast.makeText(this, "তালিকা থেকে 'KothaFlow Auto-Type' চালু করুন", Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                Toast.makeText(this, "অ্যাক্সেসিবিলিটি সেটিংস খুলতে ব্যর্থ হয়েছে", Toast.LENGTH_SHORT).show()
            }
        }

        // 3. Test Mic Button
        btnTestMic.setOnClickListener {
            checkMicPermissionAndRecord()
        }

        // 4. Optional Keyboard Setup
        btnEnableKeyboard.setOnClickListener {
            try {
                val intent = Intent(Settings.ACTION_INPUT_METHOD_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                startActivity(intent)
            } catch (_: Exception) {}
        }

        btnSelectKeyboard.setOnClickListener {
            val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
            imm.showInputMethodPicker()
        }

        requestAudioPermissionIfNeeded()
    }

    override fun onResume() {
        super.onResume()
        updateUIStatus()
    }

    private fun updateUIStatus() {
        // Floating Bubble Status
        if (FloatingBubbleService.isRunning) {
            tvBubbleStatusBadge.text = "🟢 সক্রিয়"
            tvBubbleStatusBadge.setTextColor(0xFF10B981.toInt())
            btnToggleBubble.text = "🛑 ভাসমান বাবল বন্ধ করুন"
            btnToggleBubble.setBackgroundResource(R.drawable.bg_btn_secondary)
        } else {
            tvBubbleStatusBadge.text = "⚪ বন্ধ আছে"
            tvBubbleStatusBadge.setTextColor(0xFF94A3B8.toInt())
            btnToggleBubble.text = "✨ ভাসমান বাবল চালু করুন"
            btnToggleBubble.setBackgroundResource(R.drawable.bg_btn_primary)
        }

        // Accessibility Status
        if (KothaFlowAccessibilityService.isRunning()) {
            tvAccessStatusBadge.text = "🟢 সক্রিয় আছে"
            tvAccessStatusBadge.setTextColor(0xFF10B981.toInt())
            btnEnableAccessibility.text = "✓ স্বয়ংক্রিয় টাইপিং চালু আছে"
        } else {
            tvAccessStatusBadge.text = "⚠️ বন্ধ আছে"
            tvAccessStatusBadge.setTextColor(0xFFF59E0B.toInt())
            btnEnableAccessibility.text = "অ্যাক্সেসিবিলিটি অনুমতি দিন (অন করুন)"
        }
    }

    private fun handleBubbleToggle() {
        if (!hasOverlayPermission()) {
            requestOverlayPermission()
            return
        }

        if (FloatingBubbleService.isRunning) {
            val stopIntent = Intent(this, FloatingBubbleService::class.java).apply {
                action = FloatingBubbleService.ACTION_STOP
            }
            startService(stopIntent)
            Toast.makeText(this, "ভাসমান বাবল বন্ধ করা হয়েছে", Toast.LENGTH_SHORT).show()
        } else {
            val startIntent = Intent(this, FloatingBubbleService::class.java).apply {
                action = FloatingBubbleService.ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(startIntent)
            } else {
                startService(startIntent)
            }
            Toast.makeText(this, "✨ ভাসমান বাবল সক্রিয় করা হয়েছে!", Toast.LENGTH_SHORT).show()
        }

        etTestInput.postDelayed({ updateUIStatus() }, 400)
    }

    private fun hasOverlayPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(this)
        } else {
            true
        }
    }

    private fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Toast.makeText(this, "অন্যান্য অ্যাপের উপরে বাবল দেখানোর অনুমতি দিন", Toast.LENGTH_LONG).show()
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            )
            startActivityForResult(intent, REQ_OVERLAY_PERMISSION)
        }
    }

    private fun requestAudioPermissionIfNeeded() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.RECORD_AUDIO),
                REQ_AUDIO_PERMISSION
            )
        }
    }

    private fun checkMicPermissionAndRecord() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), REQ_AUDIO_PERMISSION)
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
