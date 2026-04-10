import React from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, MessageCircle } from "lucide-react";

export default function Contact() {

  const whatsappNumber = "5521990409260"; // Coloque seu número com DDD e 55
  const message = "Olá, gostaria de consultar um funcionário!";
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  return (
    <section id="contact" className="py-20 bg-[#f8f6f1]">
      <div className="max-w-6xl mx-auto px-6">

        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            Entre em Contato
          </h2>
          <p className="text-slate-600">
            Fale conosco diretamente pelo WhatsApp.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">

          {/* Informações */}
          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <MapPin className="text-[#b8891f]" />
              <div>
                <p className="font-semibold">Endereço</p>
                <p className="text-slate-600 text-sm">
                  Rua Simeão de Faria 2340 - Juiz de Fora, MG
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <Phone className="text-[#b8891f]" />
              <div>
                <p className="font-semibold">Telefone</p>
                <p className="text-slate-600 text-sm">
                  (21) 99040-9260
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <Mail className="text-[#b8891f]" />
              <div>
                <p className="font-semibold">E-mail</p>
                <p className="text-slate-600 text-sm">
                  sucateiraosiris@gmail.com
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <Clock className="text-[#b8891f]" />
              <div>
                <p className="font-semibold">Horário</p>
                <p className="text-slate-600 text-sm">
                  Seg–Sex: 7:30h às 18:30
                </p>
              </div>
            </div>
          </div>

          {/* WhatsApp CTA */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col justify-center items-center text-center"
          >
            <div className="mb-6">
              <MessageCircle className="w-16 h-16 text-[#b8891f] mx-auto" />
            </div>

            <h3 className="text-2xl font-semibold mb-4 text-slate-900">
              Consulte nossa equipe pelo WhatsApp
            </h3>

            <p className="text-slate-600 mb-8 max-w-md">
              Atendimento rápido e personalizado.
            </p>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] hover:from-[#a67917] hover:to-[#c79a39] text-white px-10 py-4 rounded-full text-lg font-medium transition flex items-center gap-3 shadow-lg"
            >
              <MessageCircle className="w-5 h-5" />
              Chamar no WhatsApp
            </a>
          </motion.div>

        </div>
      </div>
    </section>
  );
}