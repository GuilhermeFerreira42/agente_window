# TAREFA MOBILE
- Implementar detectTouch() corretamente: 'ontouchstart' in window || navigator.maxTouchPoints>0
- Layout platform: se isPhoneViewport e isTouch -> mobile, senão desktop (nunca virar single-pane só por resize desktop)
- Aux bar skipado em mobile (shouldRenderAuxiliaryBar false)
- Mobile navigation: pushLayer para custom views, back dismiss
