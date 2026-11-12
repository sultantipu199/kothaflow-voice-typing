package com.kothaflow.ime

import android.inputmethodservice.InputMethodService
import android.media.MediaRecorder
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.InputConnection
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import kotlinx.coroutines.*
import java.io.File

class VoiceFlowInputMethodService : InputMethodService() {
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var mediaRecorder: MediaRecorder? = null
    private var audioFile: File? = null
    private var isRecording = false

    override fun onCreateInputView(): View {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(0xFF0F172A.toInt())
            setPadding(24, 24, 24, 24)
            gravity = Gravity.CENTER
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }

        val statusText = TextView(this).apply {
            text = "KothaFlow: কথা বলতে মাইক চাপুন"
            setTextColor(0xFF94A3B8.toInt())
            textSize = 14f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 16)
        }
        root.addView(statusText)

        val micButton = Button(this).apply {
            text = "🎙️ ভয়েস টাইপিং শুরু করুন"
            setTextColor(0xFFFFFFFF.toInt())
            setBackgroundColor(0xFF2563EB.toInt())
            setPadding(32, 16, 32, 16)
            setOnClickListener {
                if (!isRecording) {
                    startRecording()
                    text = "⏹️ রেকর্ডিং থামান"
                    statusText.text = "রেকর্ডিং চলছে... মুখে কথা বলুন"
                    setBackgroundColor(0xFFDC2626.toInt())
                } else {
                    stopAndInsert()
                    text = "🎙️ ভয়েস টাইপিং শুরু করুন"
                    statusText.text = "কথা টেক্সট হিসেবে যোগ করা হয়েছে"
                    setBackgroundColor(0xFF2563EB.toInt())
                }
            }
        }
        root.addView(micButton)

        return root
    }

    private fun startRecording() {
        isRecording = true
        try {
            audioFile = File(cacheDir, "kothaflow_dictation.m4a")
            mediaRecorder = MediaRecorder().apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(16000)
                setOutputFile(audioFile!!.absolutePath)
                prepare()
                start()
            }
        } catch (_: Exception) {}
    }

    private fun stopAndInsert() {
        isRecording = false
        try {
            mediaRecorder?.stop()
        } catch (_: Exception) {}
        mediaRecorder?.release()
        mediaRecorder = null

        val ic: InputConnection? = currentInputConnection
        ic?.commitText(" ", 1)

        val file = audioFile
        if (file != null && file.exists()) {
            file.delete()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
    }
}
