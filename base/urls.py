from django.urls import path
from . import views

urlpatterns = [
    path('', views.lobby, name='lobby'),
    path('room/', views.room, name='room'),
    path("get-token/", views.getToken, name='getToken'),
    path("create_member/", views.createMember, name='createMember'),
    path('get_member/', views.getMember),
    path('delete_member/', views.deleteMember),
    path("chat/", views.chat_room, name="chat_room"),
]