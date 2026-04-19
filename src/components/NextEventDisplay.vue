<script setup lang="ts">
</script>

<template>
    <div class="ned-wrapper">
        <div class="ned-left">
            <div class="ned-l-top">
                <img class="ned-flag" src="/images/default-flag.png">
                <p>PAIS</p>
            </div>
            <div class="ned-l-bottom">
                <p>PROVA</p>
                <p>TEMPO_FALTA</p>
            </div>
        </div>
        <div class="ned-right">
            <div class="ned-r-left">
                <p>HORA</p>
                <p>HORA_PISTA</p>
            </div>
            <div class="ned-r-right">
                <img class="ned-clock" src="/icons/basic-clock.svg">
            </div>
        </div>
    </div>
</template>

<style scoped>
    .ned-wrapper {
        width: 100vw;
        height: 5vh;
        display: flex;
    }

    .ned-left {
        width: 50%;
    }

    .ned-l-top {
        height: 50%;
        width: 100%;
        background-color: red;
        display: flex;
        align-items: center;
    }

    .ned-l-top * {
        margin-left: 0.5vw;
    }

    .ned-flag {
        height: 20px;
        width: 20px;
    }

    .ned-l-bottom {
        height: 50%;
        width: 100%;
        background-color: yellow;
        display: flex;
        align-items: center;
    }

    .ned-l-bottom p {
        margin-left: 0.5vw;
    }

    .ned-right {
        width: 50%;
        display: flex;
        align-items: center;
        justify-content: flex-end;
    }

    .ned-r-right {
        width: 20%;
        height: 100%;
        background-color: green;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .ned-r-right img {
        width: 40px;
        height: 40px;
    }

    .ned-r-left {
        width: 80%;
        height: 100%;
        background-color: purple;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    .ned-r-left p {
        display: flex;
        justify-content: flex-end;
        margin-right: 0.5vw;
    }
</style>